import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';

const cleanMd = (text: string) => text.replace(/(\*\*|###|##|#)/g, '').trim();

export interface DocxBranding {
  schoolName: string;
  year: string;
  primary?: string;   // hex sem '#'
  secondary?: string;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (v || fallback).replace('#', '');
}

function header(brand: DocxBranding, subtitle: string): Paragraph[] {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: brand.schoolName.toUpperCase(), bold: true, size: 28, color: brand.primary ?? cssVar('--color-primary', '#0a73ff') })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: subtitle, bold: true, size: 20, color: brand.secondary ?? cssVar('--color-secondary', '#fd852d') })] }),
  ];
}

function infoTable(rows: [string, string][][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(cells => new TableRow({
      children: cells.map(([label, value]) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)] })],
      })),
    })),
  });
}

interface ReportStudent { name: string; group: string; teacherName?: string; age: string }

export async function exportToDocx(reportText: string, studentData: ReportStudent, brand: DocxBranding) {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        ...header(brand, `Relatório Pedagógico Descritivo - ${brand.year}`),
        infoTable([
          [['ALUNO', studentData.name.toUpperCase()], ['TURMA', studentData.group]],
          [['PROFESSOR', studentData.teacherName || '---'], ['IDADE', `${studentData.age} anos`]],
        ]),
        new Paragraph({ spacing: { before: 400 } }),
        ...reportText.split('\n').filter(l => l.trim() !== '').map(line => new Paragraph({
          spacing: { after: 200, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: cleanMd(line), size: 22 })],
        })),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Relatorio_${studentData.name}.docx`);
}

interface PeiStudent { name: string; group: string; diagnosis?: string; age: string }

export async function exportPeiToDocx(reportText: string, peiData: PeiStudent, brand: DocxBranding) {
  const primary = brand.primary ?? cssVar('--color-primary', '#0a73ff');
  const children: (Paragraph | Table)[] = [
    ...header(brand, `PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) - ${brand.year}`),
    infoTable([
      [['ALUNO', peiData.name.toUpperCase()], ['TURMA', peiData.group]],
      [['DIAGNÓSTICO', peiData.diagnosis || '---'], ['IDADE', `${peiData.age} anos`]],
    ]),
    new Paragraph({ spacing: { before: 400 } }),
  ];

  const lines = reportText.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tableLine = lines[i].trim();
        if (!tableLine.match(/^\|[:\s-]*\|/)) tableLines.push(tableLine);
        i++;
      }
      if (tableLines.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableLines.map((tl, idx) => new TableRow({
            children: tl.split('|').slice(1, -1).map(cell => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cleanMd(cell), bold: idx === 0, size: 18 })], alignment: AlignmentType.CENTER })],
              shading: idx === 0 ? { fill: 'f3f4f6' } : undefined,
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            })),
          })),
        }));
        children.push(new Paragraph({ spacing: { before: 200 } }));
      }
      continue;
    }

    const isHeader = line.startsWith('#') || (line.toUpperCase() === line && line.length > 5);
    children.push(new Paragraph({
      spacing: { before: isHeader ? 300 : 100, after: 120, line: 300 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: cleanMd(line), bold: isHeader || line.includes('**'), size: isHeader ? 24 : 22, color: isHeader ? primary : '333333' })],
    }));
    i++;
  }

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `PEI_${peiData.name}.docx`);
}
