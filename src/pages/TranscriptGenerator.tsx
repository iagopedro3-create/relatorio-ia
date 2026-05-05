import { useState } from 'react';
import { Search, Printer, FileText } from 'lucide-react';
import { mockStudents } from '../store/mockDb';

const SUBJECTS_BASE = ['Língua Portuguesa', 'Arte', 'Educação Física', 'História', 'Geografia', 'Matemática', 'Ciências Físicas e Biológicas'];
const SUBJECTS_DIVERSIFIED = ['Língua Estrangeira - Inglês'];
const YEARS = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'];

const getYearLabels = (y: string) => {
  const map: Record<string, { top: string, bot: string }> = {
    '1º Ano': { top: '1º Ano', bot: '' },
    '2º Ano': { top: '2º Ano', bot: '1ª Série' },
    '3º Ano': { top: '3º Ano', bot: '2ª Série' },
    '4º Ano': { top: '4º Ano', bot: '3ª Série' },
    '5º Ano': { top: '5º Ano', bot: '4ª Série' }
  };
  return map[y];
};

type YearData = {
  escola: string;
  cidade: string;
  uf: string;
  frequencia: string;
  resultado: 'Aprovado' | 'Reprovado' | 'Cursando' | '';
  notas: Record<string, string>;
};

export function TranscriptGenerator() {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // Custom Form State
  const [naturalidade, setNaturalidade] = useState('');
  const [estado, setEstado] = useState('');
  const [pais] = useState('BRASIL');
  const [cpf, setCpf] = useState('');
  const [observacoes, setObservacoes] = useState('(*) Avaliação feita por meio de relatório descritivo.');
  const [status, setStatus] = useState('CURSANDO');
  const [resultadoFinalDescritivo, setResultadoFinalDescritivo] = useState('Aprovado');
  
  const [historyData, setHistoryData] = useState<Record<string, YearData>>(() => {
    const initial: Record<string, YearData> = {};
    YEARS.forEach(y => {
      initial[y] = { escola: 'Vida de Aprendiz', cidade: '', uf: '', frequencia: '', resultado: '', notas: {} };
    });
    return initial;
  });

  const student = mockStudents.find(s => s.id === selectedStudentId);

  const handleNotaChange = (year: string, subject: string, value: string) => {
    setHistoryData(prev => ({
      ...prev,
      [year]: {
        ...prev[year],
        notas: { ...prev[year].notas, [subject]: value }
      }
    }));
  };

  const handleInfoChange = (year: string, field: keyof YearData, value: string) => {
    setHistoryData(prev => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: value
      }
    }));
  };

  const fillMockData = () => {
    if (!student) return;
    const seed = student.id.charCodeAt(0);
    const mockH: Record<string, YearData> = {};
    YEARS.forEach((y, i) => {
      const isPast = i < 3; // Mocking that 1st, 2nd, 3rd are complete
      mockH[y] = {
        escola: isPast ? 'Vida de Aprendiz' : '',
        cidade: isPast ? 'São Paulo' : '',
        uf: isPast ? 'SP' : '',
        frequencia: isPast ? `${85 + (seed % 15)}%` : '',
        resultado: isPast ? 'Aprovado' : '',
        notas: {}
      };
      if (isPast) {
        [...SUBJECTS_BASE, ...SUBJECTS_DIVERSIFIED].forEach((sub, subI) => {
          mockH[y].notas[sub] = (7.0 + ((seed + subI + i) % 3)).toFixed(1);
        });
      }
    });
    setHistoryData(mockH);
    setNaturalidade('CABO FRIO');
    setEstado('RIO DE JANEIRO');
    setCpf('214.557.157-43');
  };

  return (
    <div>
      {/* SCREEN UI */}
      <div className="screen-only">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={24} color="var(--color-primary)" />
              Gerador de Histórico Escolar
            </h2>
            <p className="text-muted">Secretaria: Preenchimento e Emissão de Histórico (Ensino Fundamental I)</p>
          </div>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!student}>
            <Printer size={20} /> Imprimir Histórico
          </button>
        </div>

        <div className="card mb-6 p-6">
          <div className="flex items-center gap-4 mb-4">
            <Search size={20} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Selecione o Aluno --</option>
              {mockStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {student && (
              <button className="btn btn-secondary" onClick={fillMockData} style={{ fontSize: '0.8rem' }}>
                Preencher com Dados de Teste
              </button>
            )}
          </div>

          {student && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-border pt-6">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Local de Nascimento (Cidade)</label>
                <input type="text" value={naturalidade} onChange={e => setNaturalidade(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Estado (UF)</label>
                <input type="text" value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>CPF do Aluno</label>
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="000.000.000-00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Situação do Histórico (Cabeçalho)</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="CURSANDO">CURSANDO</option>
                  <option value="CONCLUÍDO">CONCLUÍDO</option>
                  <option value="TRANSFERÊNCIA">TRANSFERÊNCIA</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Decisão Final / Resultado (Declaração)</label>
                <select value={resultadoFinalDescritivo} onChange={e => setResultadoFinalDescritivo(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Reprovado">Reprovado</option>
                  <option value="Cursando">Cursando</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Observações do Histórico</label>
                <textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>
          )}
        </div>

        {student && (
          <div className="card p-0 overflow-hidden" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Componente Curricular</th>
                  {YEARS.map(y => (
                    <th key={y} style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #cbd5e1', borderLeft: '1px solid #cbd5e1' }}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...SUBJECTS_BASE, ...SUBJECTS_DIVERSIFIED].map(sub => (
                  <tr key={sub} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}>{sub}</td>
                    {YEARS.map(y => (
                      <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={historyData[y].notas[sub] || ''} 
                          onChange={e => handleNotaChange(y, sub, e.target.value)}
                          style={{ width: '100%', textAlign: 'center', border: '1px solid transparent', padding: '0.25rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* Informações Complementares da Tabela */}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>Resultado Final</td>
                  {YEARS.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                      <select 
                        value={historyData[y].resultado} 
                        onChange={e => handleInfoChange(y, 'resultado', e.target.value)}
                        style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      >
                        <option value="">—</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Reprovado">Reprovado</option>
                        <option value="Cursando">Cursando</option>
                      </select>
                    </td>
                  ))}
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>Frequência (%)</td>
                  {YEARS.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                      <input type="text" value={historyData[y].frequencia} onChange={e => handleInfoChange(y, 'frequencia', e.target.value)} style={{ width: '100%', textAlign: 'center', border: '1px solid #cbd5e1', padding: '0.25rem', borderRadius: '4px', fontSize: '0.8rem' }} />
                    </td>
                  ))}
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>Estabelecimento de Ensino</td>
                  {YEARS.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                      <input type="text" value={historyData[y].escola} onChange={e => handleInfoChange(y, 'escola', e.target.value)} style={{ width: '100%', textAlign: 'center', border: '1px solid #cbd5e1', padding: '0.25rem', borderRadius: '4px', fontSize: '0.8rem' }} />
                    </td>
                  ))}
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>Município</td>
                  {YEARS.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                      <input type="text" value={historyData[y].cidade} onChange={e => handleInfoChange(y, 'cidade', e.target.value)} style={{ width: '100%', textAlign: 'center', border: '1px solid #cbd5e1', padding: '0.25rem', borderRadius: '4px', fontSize: '0.8rem' }} />
                    </td>
                  ))}
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>Estado (UF)</td>
                  {YEARS.map(y => (
                    <td key={y} style={{ borderLeft: '1px solid #e2e8f0', padding: '0.5rem' }}>
                      <input type="text" value={historyData[y].uf} onChange={e => handleInfoChange(y, 'uf', e.target.value)} style={{ width: '100%', textAlign: 'center', border: '1px solid #cbd5e1', padding: '0.25rem', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase' }} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT ONLY UI */}
      {student && (
        <div className="print-only" style={{ color: '#000', fontFamily: 'Arial, sans-serif', padding: '0', maxWidth: '210mm', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '15px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '55px', filter: 'grayscale(100%) brightness(0)' }} />
            <div style={{ color: '#000' }}>
              <h1 style={{ fontSize: '13px', margin: '0', fontWeight: 'bold' }}>Escola Vida de Aprendiz | Ensino Fundamental I</h1>
              <p style={{ margin: 0, fontSize: '9px' }}>CNPJ: 43.642.767/0001-27 | SEI-030030/005656/2023</p>
              <p style={{ margin: 0, fontSize: '9px' }}>(22) 2040-8464 | Rua Teresina, 333, Palmeiras, Cabo Frio - RJ</p>
            </div>
          </div>

          <div style={{ border: '2px solid #000' }}>
            <div style={{ backgroundColor: '#f1f5f9', textAlign: 'center', padding: '3px', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '12px' }}>
              HISTÓRICO ESCOLAR – ENSINO FUNDAMENTAL {status}
            </div>

            {/* Student Info Box */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', borderBottom: '2px solid #000' }}>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: '1px 4px', borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <strong>Nome do Aluno:</strong> {student.name.toUpperCase()}
                  </td>
                  <td colSpan={2} style={{ padding: '1px 4px', borderBottom: '1px solid #000' }}>
                    <strong>CPF:</strong> {cpf || '_________________'}
                  </td>
                </tr>
                <tr>
                  <td rowSpan={2} style={{ width: '12%', textAlign: 'center', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>
                    Nascimento
                  </td>
                  <td colSpan={2} style={{ padding: '1px 4px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                    Município: {naturalidade.toUpperCase()}
                  </td>
                  <td style={{ padding: '1px 4px', borderBottom: '1px solid #000' }}>
                    Estado: {estado.toUpperCase()} <span style={{ marginLeft: '15px' }}>País: {pais}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: '1px 4px' }}>
                    Data: {student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Main Grades Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <tbody>
                {/* HEADERS */}
                <tr>
                  <th rowSpan={11} style={{ borderRight: '1px solid #000', borderBottom: '2px solid #000', width: '20px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '5px 0' }}>Fundamento Legal: Lei Federal 9394/96.</div>
                  </th>
                  <th rowSpan={10} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '20px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '5px 0' }}>BASE NACIONAL COMUM</div>
                  </th>
                  <th rowSpan={3} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px', textAlign: 'left', width: '150px' }}>
                    COMPONENTES CURRICULARES
                  </th>
                  <th colSpan={5} style={{ borderBottom: '1px solid #000', padding: '2px', backgroundColor: '#f1f5f9' }}>ANO LETIVO</th>
                </tr>
                <tr>
                  <th colSpan={5} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderLeft: '1px solid #000', padding: '2px' }}>CICLO I / Anos Iniciais</th>
                </tr>
                <tr>
                  {YEARS.map((y, i) => {
                    const l = getYearLabels(y);
                    return (
                      <th key={y} style={{ borderRight: i < 4 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', padding: '2px', textAlign: 'center', borderLeft: i === 0 ? '1px solid #000' : 'none' }}>
                        <div>{l.top}</div>
                        <div style={{ fontSize: '7px' }}>{l.bot}</div>
                      </th>
                    );
                  })}
                </tr>

                {/* BASE NACIONAL COMUM */}
                {SUBJECTS_BASE.map(sub => (
                  <tr key={sub}>
                    <td style={{ borderRight: '1px solid #000', borderLeft: '1px solid #000', borderBottom: '1px solid #000', padding: '1px 3px' }}>{sub}</td>
                    {YEARS.map((y, i) => (
                      <td key={y} style={{ borderRight: i < 4 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', textAlign: 'center' }}>
                        {historyData[y].notas[sub] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* PARTE DIVERSIFICADA */}
                <tr>
                  <td rowSpan={1} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '5px 0' }}>Parte DIVERSIF.</div>
                  </td>
                  {SUBJECTS_DIVERSIFIED.map((sub, idx) => (
                    <td key={sub} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: idx === 0 ? '1px solid #000' : 'none', padding: '1px 3px' }}>{sub}</td>
                  ))}
                  {YEARS.map((y, i) => (
                    <td key={y} style={{ borderRight: i < 4 ? '1px solid #000' : 'none', borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'center' }}>
                      {historyData[y].notas[SUBJECTS_DIVERSIFIED[0]] || ''}
                    </td>
                  ))}
                </tr>

                {/* ESTUDOS REALIZADOS */}
                <tr>
                  <th rowSpan={6} style={{ borderRight: '1px solid #000' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>ESTUDOS REALIZADOS</div>
                  </th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f1f5f9', padding: '2px' }}>Série/Ano</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f1f5f9', padding: '2px' }}>Ano Letivo</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f1f5f9', padding: '2px' }}>ESCOLA DE ORIGEM / Estabelecimento de Ensino</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f1f5f9', padding: '2px' }}>Município</th>
                  <th style={{ borderBottom: '1px solid #000', backgroundColor: '#f1f5f9', padding: '2px' }}>UF</th>
                </tr>
                {YEARS.map(y => {
                  const l = getYearLabels(y);
                  return (
                    <tr key={y}>
                      <td colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px' }}>
                        {l.bot ? `${l.top} / ${l.bot}` : l.top}
                      </td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px' }}>
                         {/* Ano placeholder */}
                      </td>
                      <td colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>
                        {historyData[y].escola}
                      </td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>
                        {historyData[y].cidade}
                      </td>
                      <td style={{ borderBottom: '1px solid #000', textAlign: 'center', padding: '1px', textTransform: 'uppercase' }}>
                        {historyData[y].uf}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Escala / Observações */}
            <div style={{ fontSize: '9px', padding: '2px 4px', borderBottom: '1px solid #000', fontStyle: 'italic' }}>
              Escala de Avaliação: Escala numérica de notas de 0 (zero) a 100 com palavra indicativa de desempenho escolar satisfatório, anota igual ou superior a 70.
            </div>
            <div style={{ padding: '2px 4px', borderBottom: '1px solid #000', minHeight: '40px', fontSize: '9px' }}>
              <strong>OBSERVAÇÕES:</strong><br/>
              {observacoes}
            </div>

            {/* DECLARAÇÃO */}
            <div style={{ padding: '2px', borderBottom: '1px solid #000', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
              DECLARAÇÃO
            </div>
            <div style={{ padding: '4px', borderBottom: '1px solid #000', fontSize: '9px', textAlign: 'justify' }}>
              O Diretor da Escola Vida de Aprendiz declara nos termos do Inciso VII, Artigo 24 da Lei Federal 9394/96, que {student.name.toUpperCase()}, CPF {cpf || '_______________'}, cursou até o presente momento nesta instituição, tendo sido considerado {resultadoFinalDescritivo.toUpperCase()}. Vide anexo o aproveitamento do aluno durante o período cursado.
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 2px 20px', fontSize: '9px' }}>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '2px' }}>{new Date().toLocaleDateString('pt-BR')}</div>
                DATA
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '2px' }}></div>
                Secretaria da Escola
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: '2px' }}></div>
                Diretor de Escola
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        
        @media print {
          @page { size: A4; margin: 0.5cm 1cm; }
          .screen-only, aside { display: none !important; }
          .print-only { 
            display: block !important; 
            width: 100% !important;
            page-break-inside: avoid;
            overflow: hidden;
          }
          
          body, main { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
