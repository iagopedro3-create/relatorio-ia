import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';

// Helper to clean markdown and detect bold
const cleanMd = (text: string) => text.replace(/(\*\*|###|##|#)/g, '').trim();

export async function exportToDocx(reportText: string, studentData: any) {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ESCOLA VIDA DE APRENDIZ", bold: true, size: 28, color: "0a73ff" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "Relatório Pedagógico Descritivo - 2026", bold: true, size: 20, color: "fd852d" })] }),
        
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ALUNO: ", bold: true }), new TextRun(studentData.name.toUpperCase())] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TURMA: ", bold: true }), new TextRun(studentData.group)] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PROFESSOR: ", bold: true }), new TextRun(studentData.teacherName || "---")] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "IDADE: ", bold: true }), new TextRun(`${studentData.age} anos`)] })] }),
            ]}),
          ],
        }),
        new Paragraph({ spacing: { before: 400 } }),
        ...reportText.split('\n').filter(l => l.trim() !== '').map(line => new Paragraph({
          spacing: { after: 200, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: cleanMd(line), size: 22 })],
        })),
      ]
    }]
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Relatorio_${studentData.name}.docx`);
}

export async function exportPeiToDocx(reportText: string, peiData: any) {
  const children: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ESCOLA VIDA DE APRENDIZ", bold: true, size: 28, color: "0a73ff" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) - 2026", bold: true, size: 22, color: "fd852d" })] }),
    
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ALUNO: ", bold: true }), new TextRun(peiData.name.toUpperCase())] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TURMA: ", bold: true }), new TextRun(peiData.group)] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DIAGNÓSTICO: ", bold: true }), new TextRun(peiData.diagnosis || "---")] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "IDADE: ", bold: true }), new TextRun(`${peiData.age} anos`)] })] }),
        ]}),
      ],
    }),
    new Paragraph({ spacing: { before: 400 } }),
  ];

  const lines = reportText.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Table detection: starts with |
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tableLine = lines[i].trim();
        // Skip separator lines like |---|
        if (!tableLine.match(/^\|[:\s-]*\|/)) {
          tableLines.push(tableLine);
        }
        i++;
      }

      if (tableLines.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableLines.map((tl, idx) => new TableRow({
            children: tl.split('|').filter(c => c.trim() !== '' || tl.indexOf(c) > 0 && tl.indexOf(c) < tl.length - 1).map(cell => new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: cleanMd(cell), bold: idx === 0, size: 18 })],
                alignment: AlignmentType.CENTER
              })],
              shading: idx === 0 ? { fill: "f3f4f6" } : undefined,
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }))
          }))
        }));
        children.push(new Paragraph({ spacing: { before: 200 } }));
      }
      continue;
    }

    // Normal Text or Header
    const isHeader = (line.startsWith('#') || (line.toUpperCase() === line && line.length > 5));
    children.push(new Paragraph({
      spacing: { before: isHeader ? 300 : 100, after: 120, line: 300 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ 
        text: cleanMd(line), 
        bold: isHeader || line.includes('**'), 
        size: isHeader ? 24 : 22,
        color: isHeader ? "0a73ff" : "333333"
      })]
    }));
    i++;
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `PEI_${peiData.name}.docx`);
}
