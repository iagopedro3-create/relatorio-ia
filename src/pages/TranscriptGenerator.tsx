import { useState, useMemo } from 'react';
import { Search, Printer, FileText, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listStudents, listEnrollmentsOfStudent, getClassesByIds, listGrades, listAttendanceOfEnrollments } from '../data';
import { gradedSubjects } from '../store/gradingConfig';
import { buildGradeBook, calcStudentOutcome, attendanceRate, roundGrade } from '../lib/gradeEngine';
import { logoUrl } from '../lib/branding';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/ui';
import type { SchoolYear, Student } from '../types/db';

type YearData = {
  escola: string;
  cidade: string;
  uf: string;
  anoLetivo: string;
  frequencia: string;
  resultado: 'Aprovado' | 'Reprovado' | 'Cursando' | '';
  notas: Record<string, string>;
};

export function TranscriptGenerator() {
  const { school, grading } = useSchool();
  const years = grading.series.fundamental;
  const subjects = useMemo(() => grading.subjects, [grading]);
  const baseSubjects = subjects.filter(s => s.id !== 'ing');
  const diversified = subjects.filter(s => s.id === 'ing');

  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const student = studentsQ.data.find(s => s.id === selectedStudentId);

  const [naturalidade, setNaturalidade] = useState('');
  const [estado, setEstado] = useState('');
  const pais = 'BRASIL';
  const [cpf, setCpf] = useState('');
  const [observacoes, setObservacoes] = useState('(*) Avaliação feita por meio de relatório descritivo.');
  const [status, setStatus] = useState('CURSANDO');
  const [resultadoFinal, setResultadoFinal] = useState('Aprovado');
  const [loadingSys, setLoadingSys] = useState(false);

  const emptyHistory = () => {
    const initial: Record<string, YearData> = {};
    years.forEach(y => { initial[y] = { escola: school?.name ?? '', cidade: school?.city ?? '', uf: school?.uf ?? '', anoLetivo: '', frequencia: '', resultado: '', notas: {} }; });
    return initial;
  };
  const [historyData, setHistoryData] = useState<Record<string, YearData>>(emptyHistory);

  const handleNota = (year: string, subject: string, value: string) => setHistoryData(prev => ({ ...prev, [year]: { ...prev[year], notas: { ...prev[year].notas, [subject]: value } } }));
  const handleInfo = (year: string, field: keyof YearData, value: string) => setHistoryData(prev => ({ ...prev, [year]: { ...prev[year], [field]: value } }));

  const selectStudent = (id: string) => {
    setSelectedStudentId(id);
    const s = studentsQ.data.find(x => x.id === id);
    setCpf(s?.cpf ?? '');
    setHistoryData(emptyHistory());
  };

  /** Preenche com o que a escola já lançou no sistema (matrículas em turmas do Fundamental). */
  const fillFromSystem = async () => {
    if (!student || !school) return;
    setLoadingSys(true);
    try {
      const enrollments = await listEnrollmentsOfStudent(student.id);
      const classes = await getClassesByIds(enrollments.map(e => e.class_id));
      const yearRows = (await supabase.from('school_years').select('*').eq('school_id', school.id)).data as SchoolYear[] | null;
      const graded = gradedSubjects(subjects);
      const next = emptyHistory();
      let filled = 0;
      for (const e of enrollments) {
        const cls = classes.find(c => c.id === e.class_id);
        if (!cls || cls.level !== 'fundamental' || !years.includes(cls.series)) continue;
        const [grades, att] = await Promise.all([listGrades([e.id]), listAttendanceOfEnrollments([e.id])]);
        const entries = grades.map(g => ({ subject_id: g.subject_id, period: g.period, component_id: g.component_id, value: Number(g.value) }));
        const outcome = calcStudentOutcome(graded.map(s => buildGradeBook(entries, s.id)), graded, attendanceRate(att), grading.policy);
        const notas: Record<string, string> = {};
        for (const r of outcome.subjects) {
          const subj = subjects.find(s => s.id === r.subjectId);
          if (subj && r.final !== null) notas[subj.officialName] = roundGrade(r.final, grading.policy).toFixed(grading.policy.decimals);
        }
        for (const subj of subjects.filter(s => s.evaluation === 'report')) notas[subj.officialName] = '*';
        const freq = outcome.attendance;
        next[cls.series] = {
          escola: school.name,
          cidade: school.city ?? '',
          uf: school.uf ?? '',
          anoLetivo: yearRows?.find(y => y.id === cls.year_id)?.label ?? '',
          frequencia: freq === null ? '' : `${freq.toFixed(0)}%`,
          resultado: outcome.status === 'APROVADO' ? 'Aprovado' : outcome.status === 'CURSANDO' ? 'Cursando' : outcome.status.startsWith('REPROVADO') ? 'Reprovado' : '',
          notas,
        };
        filled++;
      }
      setHistoryData(next);
      toast.success(filled > 0 ? `${filled} ano(s) preenchido(s) com dados do sistema.` : 'Nenhuma matrícula no Fundamental encontrada para este aluno.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao buscar dados.');
    } finally {
      setLoadingSys(false);
    }
  };

  const yearLabel = (y: string, i: number) => ({ top: y, bot: i === 0 ? '' : `${i}ª Série` });
  const cell: React.CSSProperties = { width: '100%', textAlign: 'center', border: '1px solid var(--color-border-strong)', padding: '0.25rem', borderRadius: '4px', fontSize: '0.8rem' };

  return (
    <div>
      <div className="screen-only">
        <PageHeader
          icon={<FileText size={22} />}
          title="Histórico escolar"
          subtitle="Secretaria: preenchimento e emissão (Ensino Fundamental I). Anos cursados aqui vêm do sistema; anos anteriores são digitados."
          actions={<button className="btn btn-primary" onClick={() => window.print()} disabled={!student}><Printer size={18} /> Imprimir histórico</button>}
        />

        {!school?.legal_name || !school?.cnpj ? (
          <div className="callout callout-warning mb-4">
            <span>Preencha razão social, CNPJ, cidade/UF e o texto de autorização em <strong>Configurações → Escola</strong> para o cabeçalho e a declaração saírem completos.</span>
          </div>
        ) : null}

        <div className="card mb-6 p-6">
          <div className="flex items-center gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
            <Search size={20} style={{ color: 'var(--color-text-muted)' }} />
            <select value={selectedStudentId} onChange={e => selectStudent(e.target.value)} style={{ width: '100%', maxWidth: '400px' }} disabled={studentsQ.loading}>
              <option value="">{studentsQ.loading ? 'Carregando alunos…' : '-- Selecione o aluno --'}</option>
              {studentsQ.data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {student && <button className="btn btn-secondary" onClick={() => void fillFromSystem()} disabled={loadingSys} style={{ fontSize: '0.8rem' }}><Database size={14} /> {loadingSys ? 'Buscando...' : 'Preencher com dados do sistema'}</button>}
          </div>

          {student && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-slate-200 pt-6">
              <div><label style={{ fontSize: '0.85rem' }}>Local de Nascimento (Cidade)</label><input type="text" value={naturalidade} onChange={e => setNaturalidade(e.target.value)} style={{ textTransform: 'uppercase' }} /></div>
              <div><label style={{ fontSize: '0.85rem' }}>Estado (UF) de nascimento</label><input type="text" value={estado} onChange={e => setEstado(e.target.value)} style={{ textTransform: 'uppercase' }} /></div>
              <div><label style={{ fontSize: '0.85rem' }}>CPF do Aluno</label><input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" /></div>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Situação do Histórico (Cabeçalho)</label>
                <select value={status} onChange={e => setStatus(e.target.value)}><option value="CURSANDO">CURSANDO</option><option value="CONCLUÍDO">CONCLUÍDO</option><option value="TRANSFERÊNCIA">TRANSFERÊNCIA</option></select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Decisão Final / Resultado (Declaração)</label>
                <select value={resultadoFinal} onChange={e => setResultadoFinal(e.target.value)}><option value="Aprovado">Aprovado</option><option value="Reprovado">Reprovado</option><option value="Cursando">Cursando</option></select>
              </div>
              <div className="md:col-span-2"><label style={{ fontSize: '0.85rem' }}>Observações do Histórico</label><textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ minHeight: '70px' }} /></div>
            </div>
          )}
        </div>

        {student && (
          <div className="card p-0 overflow-hidden" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-border-soft)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid var(--color-border-strong)' }}>Componente Curricular</th>
                  {years.map(y => <th key={y} style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--color-border-strong)', borderLeft: '1px solid var(--color-border-strong)' }}>{y}</th>)}
                </tr>
              </thead>
              <tbody>
                {subjects.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>{sub.officialName}</td>
                    {years.map(y => (
                      <td key={y} style={{ borderLeft: '1px solid var(--color-border)', padding: '0.5rem' }}>
                        <input type="text" value={historyData[y].notas[sub.officialName] || ''} onChange={e => handleNota(y, sub.officialName, e.target.value)} style={{ ...cell, border: '1px solid transparent', backgroundColor: 'var(--color-surface-2)' }} placeholder="—" />
                      </td>
                    ))}
                  </tr>
                ))}
                {([
                  ['Ano letivo', 'anoLetivo'], ['Frequência (%)', 'frequencia'], ['Estabelecimento de Ensino', 'escola'], ['Município', 'cidade'], ['Estado (UF)', 'uf'],
                ] as [string, keyof YearData][]).map(([label, field]) => (
                  <tr key={field} style={{ backgroundColor: 'var(--color-surface-2)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-text)' }}>{label}</td>
                    {years.map(y => (
                      <td key={y} style={{ borderLeft: '1px solid var(--color-border)', padding: '0.5rem' }}>
                        <input type="text" value={historyData[y][field] as string} onChange={e => handleInfo(y, field, e.target.value)} style={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ backgroundColor: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-strong)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-text)' }}>Resultado Final</td>
                  {years.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid var(--color-border)', padding: '0.5rem' }}>
                      <select value={historyData[y].resultado} onChange={e => handleInfo(y, 'resultado', e.target.value)} style={{ ...cell, padding: '0.25rem' }}>
                        <option value="">—</option><option value="Aprovado">Aprovado</option><option value="Reprovado">Reprovado</option><option value="Cursando">Cursando</option>
                      </select>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {student && school && (
        <div className="print-only" style={{ color: '#000', fontFamily: 'Arial, sans-serif', maxWidth: '210mm', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '12px' }}>
            <img src={logoUrl(school)} alt="Logo" style={{ height: '45px' }} />
            <div style={{ color: '#000' }}>
              <h1 style={{ fontSize: '11px', margin: 0, fontWeight: 'bold', color: '#000' }}>{school.legal_name || school.name} | Ensino Fundamental I</h1>
              {school.cnpj && <p style={{ margin: 0, fontSize: '8px' }}>CNPJ: {school.cnpj}</p>}
              {(school.city || school.uf) && <p style={{ margin: 0, fontSize: '8px' }}>{[school.city, school.uf].filter(Boolean).join(' - ')}</p>}
              {school.authorization_text && <p style={{ margin: 0, fontSize: '8px' }}>{school.authorization_text}</p>}
            </div>
          </div>

          <div style={{ border: '2px solid #000' }}>
            <div style={{ backgroundColor: 'var(--color-border-soft)', textAlign: 'center', padding: '2px', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '10px' }}>HISTÓRICO ESCOLAR – ENSINO FUNDAMENTAL {status}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', borderBottom: '1px solid #000' }}>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: '0 4px', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}><strong>Nome do Aluno:</strong> {student.name.toUpperCase()}</td>
                  <td colSpan={2} style={{ padding: '0 4px', borderBottom: '1px solid #000' }}><strong>CPF:</strong> {cpf || '_________________'}</td>
                </tr>
                <tr>
                  <td rowSpan={2} style={{ width: '12%', textAlign: 'center', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '8px' }}>Nascimento</td>
                  <td colSpan={2} style={{ padding: '0 4px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>Município: {naturalidade.toUpperCase()}</td>
                  <td style={{ padding: '0 4px', borderBottom: '1px solid #000' }}>Estado: {estado.toUpperCase()} <span style={{ marginLeft: '15px' }}>País: {pais}</span></td>
                </tr>
                <tr><td colSpan={3} style={{ padding: '0 4px' }}>Data: {student.birth_date ? new Date(student.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
              <tbody>
                <tr>
                  <th rowSpan={3 + baseSubjects.length + diversified.length} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '20px' }}><div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '3px 0' }}>Fundamento Legal: Lei Federal 9394/96.</div></th>
                  <th rowSpan={3 + baseSubjects.length} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '20px' }}><div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '3px 0' }}>BASE NACIONAL COMUM</div></th>
                  <th rowSpan={3} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '1px', textAlign: 'left', width: '150px' }}>COMPONENTES CURRICULARES</th>
                  <th colSpan={years.length} style={{ borderBottom: '1px solid #000', padding: '1px', backgroundColor: 'var(--color-border-soft)' }}>ANO LETIVO</th>
                </tr>
                <tr><th colSpan={years.length} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderLeft: '1px solid #000', padding: '1px' }}>CICLO I / Anos Iniciais</th></tr>
                <tr>
                  {years.map((y, i) => { const l = yearLabel(y, i); return <th key={y} style={{ borderRight: i < years.length - 1 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', padding: '1px', textAlign: 'center', borderLeft: i === 0 ? '1px solid #000' : 'none' }}><div>{l.top}</div><div style={{ fontSize: '6px' }}>{l.bot}</div></th>; })}
                </tr>
                {baseSubjects.map(sub => (
                  <tr key={sub.id}>
                    <td style={{ borderRight: '1px solid #000', borderLeft: '1px solid #000', borderBottom: '1px solid #000', padding: '0 3px' }}>{sub.officialName}</td>
                    {years.map((y, i) => <td key={y} style={{ borderRight: i < years.length - 1 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', textAlign: 'center' }}>{historyData[y].notas[sub.officialName] || ''}</td>)}
                  </tr>
                ))}
                {diversified.map((sub, idx) => (
                  <tr key={sub.id}>
                    {idx === 0 && <td rowSpan={diversified.length} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: '1px solid #000' }}><div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '3px 0' }}>Parte DIVERSIF.</div></td>}
                    <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: idx === 0 ? '1px solid #000' : 'none', padding: '0 3px' }}>{sub.officialName}</td>
                    {years.map((y, i) => <td key={y} style={{ borderRight: i < years.length - 1 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', borderTop: idx === 0 ? '1px solid #000' : 'none', textAlign: 'center' }}>{historyData[y].notas[sub.officialName] || ''}</td>)}
                  </tr>
                ))}
                <tr>
                  <th rowSpan={years.length + 1} style={{ borderRight: '1px solid #000' }}><div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>ESTUDOS REALIZADOS</div></th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: 'var(--color-border-soft)', padding: '1px' }}>Série/Ano</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: 'var(--color-border-soft)', padding: '1px' }}>Ano Letivo</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: 'var(--color-border-soft)', padding: '1px' }}>Estabelecimento de Ensino</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: 'var(--color-border-soft)', padding: '1px' }}>Município</th>
                  <th style={{ borderBottom: '1px solid #000', backgroundColor: 'var(--color-border-soft)', padding: '1px' }}>UF</th>
                </tr>
                {years.map((y, i) => {
                  const l = yearLabel(y, i);
                  return (
                    <tr key={y}>
                      <td colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px' }}>{l.bot ? `${l.top} / ${l.bot}` : l.top}</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px' }}>{historyData[y].anoLetivo}</td>
                      <td colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>{historyData[y].escola}</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>{historyData[y].cidade}</td>
                      <td style={{ borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>{historyData[y].uf}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ fontSize: '8px', padding: '1px 4px', borderBottom: '1px solid #000', fontStyle: 'italic' }}>
              Escala de Avaliação: notas de {grading.policy.scale.min} a {grading.policy.scale.max}; desempenho satisfatório igual ou superior a {grading.policy.passingGrade}. Frequência mínima: {grading.policy.minAttendance}%.
            </div>
            <div style={{ padding: '1px 4px', borderBottom: '1px solid #000', minHeight: '30px', fontSize: '8px' }}><strong>OBSERVAÇÕES:</strong><br />{observacoes}</div>
            <div style={{ padding: '1px', borderBottom: '1px solid #000', fontSize: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: 'var(--color-border-soft)' }}>DECLARAÇÃO</div>
            <div style={{ padding: '3px', borderBottom: '1px solid #000', fontSize: '8px', textAlign: 'justify' }}>
              A Direção de {school.legal_name || school.name} declara, nos termos do Inciso VII, Artigo 24 da Lei Federal 9394/96, que {student.name.toUpperCase()}, CPF {cpf || '_______________'}, cursou até o presente momento nesta instituição, tendo sido considerado(a) {resultadoFinal.toUpperCase()}. Vide o aproveitamento do aluno durante o período cursado.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 20px 2px 20px', fontSize: '8px' }}>
              <div style={{ textAlign: 'center', width: '30%' }}><div style={{ borderBottom: '1px solid #000', marginBottom: '1px' }}>{new Date().toLocaleDateString('pt-BR')}</div>DATA</div>
              <div style={{ textAlign: 'center', width: '30%' }}><div style={{ borderBottom: '1px solid #000', marginBottom: '1px' }}></div>Secretaria da Escola</div>
              <div style={{ textAlign: 'center', width: '30%' }}><div style={{ borderBottom: '1px solid #000', marginBottom: '1px' }}></div>Direção</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4; margin: 0.3cm 0.8cm; }
          .screen-only, aside { display: none !important; }
          .print-only { display: block !important; width: 100% !important; page-break-inside: avoid; overflow: hidden; }
          body, main { background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        }
      `}</style>
    </div>
  );
}

