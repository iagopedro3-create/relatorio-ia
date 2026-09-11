import { useState } from 'react';
import { Send, CheckSquare, MessageSquare, GraduationCap } from 'lucide-react';
import { BNCC_CHECKLISTS } from '../store/bnccData';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { calcAgeYears } from '../lib/format';
import type { ClassGroup, Student } from '../types/db';

export type ItemStatus = 'none' | 'developing' | 'consolidated';
export type AgeGroupId = 'bebes' | 'pequenas_bem' | 'pequenas' | 'fundamental_1';

export type StudentData = {
  studentId: string;
  classId: string;
  name: string;
  age: string;
  group: string;
  ageGroupId: AgeGroupId;
  teacherName: string;
  parentsName: string;
  subject?: string;
  reportContext: string;
  reportTone: 'affectionate' | 'pedagogical' | 'concise';
  generalObservations: string;
  socialMap: Record<string, ItemStatus>; fieldSocial: string;
  motorMap: Record<string, ItemStatus>; fieldMotor: string;
  artsMap: Record<string, ItemStatus>; fieldArts: string;
  languageMap: Record<string, ItemStatus>; fieldLanguage: string;
  logicMap: Record<string, ItemStatus>; fieldLogic: string;
  englishMap: Record<string, ItemStatus>; fieldEnglish: string;
  peMap: Record<string, ItemStatus>; fieldPe: string;
  positivePoints: string;
  attentionPoints: string;
  photo1?: string;
  photo2?: string;
  photo3?: string;
};

export interface RosterStudent {
  student: Student;
  cls: ClassGroup;
}

interface ReportFormProps {
  students: RosterStudent[];
  onSubmit: (data: StudentData) => void;
  isLoading: boolean;
  /** Avisa o pai quando o aluno muda (para listar relatórios anteriores). */
  onStudentChange?: (studentId: string | null) => void;
}

const AGE_GROUPS: { id: AgeGroupId; label: string }[] = [
  { id: 'bebes', label: 'Bebês (0 a 1 ano e 6 meses)' },
  { id: 'pequenas_bem', label: 'Crianças bem pequenas (1a7m a 3a11m)' },
  { id: 'pequenas', label: 'Crianças pequenas (4 a 5 anos e 11 meses)' },
  { id: 'fundamental_1', label: '1º Ano (Ensino Fundamental I)' },
];

const EXTRA_CONTEXTS = ['Laudo/Relatório Médico', 'Relatório Psicopedagógico', 'Relatório de Transferência', 'Outros Fins'];

/** Faixa da BNCC sugerida pela série da turma (a professora pode trocar). */
function guessAgeGroup(cls: ClassGroup, infantilSeries: string[]): AgeGroupId {
  if (cls.level === 'fundamental') return 'fundamental_1';
  const idx = infantilSeries.indexOf(cls.series);
  if (idx <= 0) return 'bebes';
  if (idx <= 2) return 'pequenas_bem';
  return 'pequenas';
}

export function ReportForm({ students, onSubmit, isLoading, onStudentChange }: ReportFormProps) {
  const { user } = useAuth();
  const { grading } = useSchool();
  const contexts = [...grading.periods, ...EXTRA_CONTEXTS];

  const [formData, setFormData] = useState<StudentData>({
    studentId: '',
    classId: '',
    name: '',
    age: '',
    group: '',
    ageGroupId: 'bebes',
    teacherName: user?.name || '',
    parentsName: '',
    subject: user?.specialty === 'english' ? 'Inglês' : (user?.specialty === 'pe' ? 'Educação Física' : ''),
    reportContext: grading.periods[0],
    reportTone: 'pedagogical',
    generalObservations: '',
    socialMap: {}, fieldSocial: '',
    motorMap: {}, fieldMotor: '',
    artsMap: {}, fieldArts: '',
    languageMap: {}, fieldLanguage: '',
    logicMap: {}, fieldLogic: '',
    englishMap: {}, fieldEnglish: '',
    peMap: {}, fieldPe: '',
    positivePoints: '',
    attentionPoints: '',
    photo1: '', photo2: '', photo3: '',
  });

  const selectStudent = (studentId: string) => {
    const entry = students.find(s => s.student.id === studentId);
    onStudentChange?.(entry ? studentId : null);
    if (!entry) { setFormData(prev => ({ ...prev, studentId: '', classId: '', name: '', age: '', group: '', parentsName: '' })); return; }
    const { student, cls } = entry;
    setFormData(prev => ({
      ...prev,
      studentId: student.id,
      classId: cls.id,
      name: student.name,
      age: student.birth_date ? String(calcAgeYears(student.birth_date)) : '',
      group: cls.name,
      ageGroupId: guessAgeGroup(cls, grading.series.infantil),
      parentsName: [student.guardian1, student.guardian2].filter(Boolean).join(' e '),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCycleStatus = (mapField: keyof StudentData, item: string) => {
    setFormData(prev => {
      const currentMap = { ...(prev[mapField] as Record<string, ItemStatus>) };
      const current = currentMap[item] || 'none';
      currentMap[item] = current === 'none' ? 'developing' : current === 'developing' ? 'consolidated' : 'none';
      return { ...prev, [mapField]: currentMap };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo1' | 'photo2' | 'photo3') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, [field]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderField = (title: string, checklistKey: string, mapField: keyof StudentData, textKey: keyof StudentData) => {
    const items = (BNCC_CHECKLISTS[formData.ageGroupId] as Record<string, string[]>)[checklistKey] || [];
    const statusMap = (formData[mapField] as Record<string, ItemStatus>) || {};

    return (
      <div className="form-group mb-8" style={{ borderLeft: '4px solid var(--color-primary)', paddingLeft: '1.5rem' }}>
        <label style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{title}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#fdfdfd', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          {items.map(item => {
            const status = statusMap[item] || 'none';
            const bg = status === 'developing' ? 'rgba(255, 203, 100, 0.2)' : status === 'consolidated' ? 'rgba(16, 185, 129, 0.15)' : 'transparent';
            const border = status === 'developing' ? 'var(--color-accent)' : status === 'consolidated' ? 'var(--color-success)' : 'var(--color-border)';
            const label = status === 'developing' ? 'Em desenvolvimento' : status === 'consolidated' ? 'Consolidado' : 'Não observado';
            return (
              <div key={item} onClick={() => handleCycleStatus(mapField, item)} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${border}`, backgroundColor: bg, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item}</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: status === 'none' ? 'var(--color-text-muted)' : status === 'developing' ? '#b45309' : '#047857' }}>{label}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <MessageSquare size={14} /> Detalhamento Pedagógico / Observações:
        </div>
        <textarea name={textKey as string} value={formData[textKey] as string} onChange={handleChange} placeholder="Descreva avanços específicos ou necessidades de apoio para este campo..." style={{ minHeight: '80px' }} />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ margin: 0 }}>Ficha de Avaliação Individual</h2>
        <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
          <GraduationCap size={16} /> BNCC
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="form-group">
          <label htmlFor="studentId">Aluno *</label>
          <select required id="studentId" value={formData.studentId} onChange={e => selectStudent(e.target.value)}>
            <option value="">Selecione um aluno...</option>
            {students.map(({ student, cls }) => <option key={student.id} value={student.id}>{student.name} — {cls.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="age">Idade *</label>
          <input required type="number" id="age" name="age" value={formData.age} onChange={handleChange} placeholder="Idade atual" />
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="form-group">
          <label htmlFor="ageGroupId">Faixa etária (BNCC) *</label>
          <select required id="ageGroupId" name="ageGroupId" value={formData.ageGroupId} onChange={handleChange}>
            {AGE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="reportContext">Finalidade do Relatório</label>
          <select id="reportContext" name="reportContext" value={formData.reportContext} onChange={handleChange}>
            {contexts.map(ctx => <option key={ctx} value={ctx}>{ctx}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 mt-4">
        <div className="form-group">
          <label htmlFor="reportTone">Tom do Relatório</label>
          <select id="reportTone" name="reportTone" value={formData.reportTone} onChange={handleChange}>
            <option value="pedagogical">Pedagógico e Técnico (Equilibrado)</option>
            <option value="affectionate">Afetivo e Próximo (Para as famílias)</option>
            <option value="concise">Conciso e Direto (Para prontuários)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="teacherName">Nome do Professor(a)</label>
          <input type="text" id="teacherName" name="teacherName" value={formData.teacherName} onChange={handleChange} placeholder="Responsável pelo relato" />
        </div>
      </div>

      <div className="grid grid-cols-2 mt-4">
        <div className="form-group">
          <label htmlFor="parentsName">Nome dos Responsáveis</label>
          <input type="text" id="parentsName" name="parentsName" value={formData.parentsName} onChange={handleChange} placeholder="Ex: Sr. Carlos e Sra. Ana" />
        </div>
        {(user?.specialty || user?.role === 'admin' || user?.role === 'coordinator') && (
          <div className="form-group">
            <label htmlFor="subject">Disciplina (para especialistas)</label>
            <select id="subject" name="subject" value={formData.subject || ''} onChange={handleChange}>
              <option value="">Geral / Regência (Todos os campos)</option>
              <option value="Inglês">Inglês</option>
              <option value="Educação Física">Educação Física</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-group mt-4">
        <label htmlFor="generalObservations">Abertura e Contextualização do Período</label>
        <textarea id="generalObservations" name="generalObservations" value={formData.generalObservations} onChange={handleChange} placeholder="Como o aluno se integrou ao grupo e participou da rotina escolar neste período?" />
      </div>

      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '2px dashed var(--color-border)' }} />

      <div className="flex items-center gap-2 mb-2">
        <CheckSquare size={24} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Avaliação por Campos de Experiência / Habilidades</h3>
      </div>
      <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
        Clique nos itens para alternar entre: <strong>Não observado</strong> ➔ <strong>Em desenvolvimento</strong> ➔ <strong>Consolidado</strong>.
      </p>

      {!formData.subject ? (
        <>
          {renderField('O eu, o outro e o nós', 'social', 'socialMap', 'fieldSocial')}
          {renderField('Corpo, gestos e movimentos', 'motor', 'motorMap', 'fieldMotor')}
          {renderField('Traços, sons, cores e formas', 'arts', 'artsMap', 'fieldArts')}
          {renderField('Escuta, fala, pensamento e imaginação', 'language', 'languageMap', 'fieldLanguage')}
          {renderField('Espaços, tempos, quantidades, relações e transformações', 'logic', 'logicMap', 'fieldLogic')}
        </>
      ) : formData.subject === 'Inglês' ? (
        renderField('Desenvolvimento em Língua Inglesa', 'english', 'englishMap', 'fieldEnglish')
      ) : formData.subject === 'Educação Física' ? (
        renderField('Desenvolvimento em Educação Física', 'pe', 'peMap', 'fieldPe')
      ) : null}

      <div className="grid grid-cols-2 mt-4">
        <div className="form-group">
          <label>Potencialidades / Destaques</label>
          <textarea name="positivePoints" value={formData.positivePoints} onChange={handleChange} placeholder="Quais os principais avanços e brilhos do aluno?" />
        </div>
        <div className="form-group">
          <label>Recomendações / Próximos Passos</label>
          <textarea name="attentionPoints" value={formData.attentionPoints} onChange={handleChange} placeholder="Quais estímulos serão priorizados no próximo período?" />
        </div>
      </div>

      {formData.ageGroupId !== 'fundamental_1' && (
        <div className="grid grid-cols-2 mt-4" style={{ gap: '2rem' }}>
          {(['photo1', 'photo2', 'photo3'] as const).map((field, i) => (
            <div className="form-group" key={field}>
              <label>Foto do Aluno em Atividade {i + 1}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, field)} style={{ fontSize: '0.8rem' }} />
                {formData[field] && <img src={formData[field]} alt={`Atividade ${i + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--color-border)' }} />}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-muted mt-4" style={{ fontSize: '0.8rem' }}>
        Privacidade: a IA recebe apenas o primeiro nome, a idade e a turma da criança. Sobrenome, nascimento, responsáveis e fotos ficam só no documento impresso.
      </p>

      <div className="flex justify-center mt-8">
        <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !formData.studentId} style={{ height: '70px', fontSize: '1.25rem', borderRadius: 'var(--radius-xl)' }}>
          {isLoading ? <><span className="loader"></span> Redigindo Relatório...</> : <><Send size={22} /> Gerar Relatório com IA</>}
        </button>
      </div>
    </form>
  );
}
