import { useState, useMemo } from 'react';
import { Printer, BookOpen, Users, FileText } from 'lucide-react';
import { mockStudents, mockClasses, mockAttendance, mockLessons } from '../store/mockDb';
import { useUsers } from '../contexts/UserContext';
import type { ClassGroup, Student, User } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';

const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const BIMESTRE_MONTHS: Record<string, number[]> = {
  '1º Bimestre': [1, 2, 3], // Fev, Mar, Abr
  '2º Bimestre': [4, 5, 6], // Mai, Jun, Jul
  '3º Bimestre': [7, 8],    // Ago, Set
  '4º Bimestre': [9, 10, 11] // Out, Nov, Dez
};

const HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Ano Novo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-02-18': 'Cinzas',
  '2026-04-03': 'Sexta Santa',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência',
  '2026-10-12': 'Nsa. Sra. Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Procl. República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal'
};

export function ClassDiary() {
  const { user } = useAuth();
  const { users } = useUsers();
  const [selectedClassId, setSelectedClassId] = useState(user?.classId || 'c1');
  const [selectedBimestre, setSelectedBimestre] = useState('1º Bimestre');

  const currentClass = useMemo(() => 
    mockClasses.find((c: ClassGroup) => c.id === selectedClassId),
    [selectedClassId]
  );

  const teacher = useMemo(() => 
    users.find((u: User) => u.id === currentClass?.teacherId) || { name: 'Não atribuído' },
    [currentClass, users]
  );

  const students = useMemo(() => 
    mockStudents.filter((s: Student) => s.classId === selectedClassId),
    [selectedClassId]
  );

  const monthsInBimestre = BIMESTRE_MONTHS[selectedBimestre];

  const handlePrint = () => {
    window.print();
  };

  const isWeekend = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getHoliday = (year: number, month: number, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return HOLIDAYS_2026[dateKey];
  };

  // Mock some lessons for the bimester if none exist
  const relevantLessons = useMemo(() => {
    const filtered = mockLessons.filter((l: any) => l.classId === selectedClassId);
    if (filtered.length > 0) return filtered;

    // Generate dummy lessons for preview
    const dummy: any[] = [];
    monthsInBimestre.forEach(m => {
      [5, 12, 19, 26].forEach((d, i) => {
        dummy.push({
          id: `d-${m}-${d}`,
          date: `2026-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          subject: currentClass?.level === 'infantil' ? 'Vivências' : 'Língua Portuguesa',
          content: `Desenvolvimento de atividades relacionadas ao tema do projeto estruturante. Aula ${i+1}.`,
          observations: 'Participação ativa da turma.'
        });
      });
    });
    return dummy.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedClassId, selectedBimestre, currentClass]);

  return (
    <div className="diary-generator">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { background-color: white !important; padding: 0 !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .diary-print-container { padding: 0 !important; width: 100% !important; }
          table { font-size: 10px !important; }
          th, td { padding: 4px !important; }
          @page { size: landscape; margin: 1cm; }
        }
        
        .attendance-table th, .attendance-table td {
          border: 1px solid #ddd;
          text-align: center;
          min-width: 20px;
        }
        
        .attendance-table th:first-child, .attendance-table td:first-child {
          text-align: left;
          padding-left: 8px;
          min-width: 150px;
        }

        .lesson-log-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .lesson-log-table th, .lesson-log-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        .lesson-log-table th { background-color: #f5f5f5; }
      `}</style>

      {/* Controls */}
      <div className="no-print card mb-6" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="flex items-center gap-2"><BookOpen size={24} color="var(--color-primary)" /> Gerador de Diário Escolar</h2>
          <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
            <Printer size={18} /> Imprimir Diário Completo
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label>Selecione a Turma</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
              {mockClasses.map((c: ClassGroup) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Selecione o Bimestre</label>
            <select value={selectedBimestre} onChange={e => setSelectedBimestre(e.target.value)}>
              {BIMESTRES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
          <FileText size={20} color="var(--color-primary)" className="mt-1" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Nota para Impressão</p>
            <p className="text-xs text-blue-700">O diário será gerado em formato paisagem, consolidando a frequência mensal e o registro de conteúdos do bimestre selecionado.</p>
          </div>
        </div>
      </div>

      {/* Print Preview Container */}
      <div className="diary-print-container bg-white p-8 rounded-lg shadow-sm border border-border">
        
        {/* HEADER (Repeatable on pages) */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>VIDA DE APRENDIZ - CENTRO EDUCACIONAL</h1>
          <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 600 }}>DIÁRIO ESCOLAR DIGITAL - {new Date().getFullYear()}</p>
          
          <div className="flex justify-center gap-8 mt-4">
            <div className="text-left">
              <p style={{ margin: 0, fontSize: '12px' }}><strong>TURMA:</strong> {currentClass?.name}</p>
              <p style={{ margin: 0, fontSize: '12px' }}><strong>NÍVEL:</strong> {currentClass?.level === 'infantil' ? 'EDUCAÇÃO INFANTIL' : 'ENSINO FUNDAMENTAL'}</p>
            </div>
            <div className="text-left">
              <p style={{ margin: 0, fontSize: '12px' }}><strong>PROFESSOR(A):</strong> {teacher.name}</p>
              <p style={{ margin: 0, fontSize: '12px' }}><strong>PERÍODO:</strong> {selectedBimestre}</p>
            </div>
          </div>
        </div>

        {/* ATTENDANCE SECTION */}
        <div className="mb-12">
          <h3 className="flex items-center gap-2 mb-4 border-b border-gray-300 pb-2"><Users size={18} /> Controle de Frequência</h3>
          
          {monthsInBimestre.map((monthIdx, mIdx) => {
            const year = 2026;
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            return (
              <div key={monthIdx} className={mIdx > 0 ? "mt-8" : ""}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#333' }}>Mês: {MONTH_NAMES[monthIdx]}</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ width: '200px' }}>Alunos</th>
                        {days.map(d => {
                          const holiday = getHoliday(year, monthIdx, d);
                          const weekend = isWeekend(year, monthIdx, d);
                          return (
                            <th key={d} style={{ 
                              backgroundColor: holiday ? '#fef3c7' : weekend ? '#f3f4f6' : 'transparent',
                              fontSize: '9px'
                            }}>{d}</th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student: Student) => (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 600, fontSize: '11px' }}>{student.name}</td>
                          {days.map(d => {
                            const holiday = getHoliday(year, monthIdx, d);
                            const weekend = isWeekend(year, monthIdx, d);
                            const dateKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const record = mockAttendance.find(a => a.studentId === student.id && a.date === dateKey);
                            const status = record ? record.status : '.';
                            
                            return (
                              <td key={d} style={{ 
                                backgroundColor: holiday ? '#fef3c7' : weekend ? '#f3f4f6' : 'transparent',
                                color: holiday ? '#92400e' : (status === 'F' ? '#991b1b' : 'inherit'),
                                fontSize: '10px',
                                fontWeight: status !== '.' ? 700 : 400
                              }}>
                                {holiday ? 'F' : weekend ? '-' : status}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* PAGE BREAK FOR LESSONS */}
        <div className="page-break"></div>

        {/* LESSON LOG SECTION */}
        <div className="mt-8">
          <h3 className="flex items-center gap-2 mb-4 border-b border-gray-300 pb-2"><BookOpen size={18} /> Registro de Conteúdos e Atividades</h3>
          
          <table className="lesson-log-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Data</th>
                <th style={{ width: '150px' }}>Disciplina</th>
                <th>Conteúdo Ministrado</th>
                <th style={{ width: '150px' }}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {relevantLessons.map(lesson => (
                <tr key={lesson.id}>
                  <td style={{ fontWeight: 700 }}>{new Date(lesson.date).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{lesson.subject}</td>
                  <td>{lesson.content}</td>
                  <td style={{ fontSize: '11px', color: '#666' }}>{lesson.observations || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SIGNATURES */}
        <div className="mt-16 grid grid-cols-2 gap-12 no-print-mt-24">
          <div className="text-center">
            <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Professor(a)</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>{teacher.name}</p>
            </div>
          </div>
          <div className="text-center">
            <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Coordenação / Direção</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Vida de Aprendiz</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-right text-xs text-gray-400">
          Documento gerado em {new Date().toLocaleString('pt-BR')} via Sistema Vida de Aprendiz
        </div>

      </div>
    </div>
  );
}
