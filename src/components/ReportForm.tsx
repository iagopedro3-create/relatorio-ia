import { useState, useEffect } from 'react';
import { Send, CheckSquare, MessageSquare, GraduationCap } from 'lucide-react';
import { BNCC_CHECKLISTS } from '../store/bnccData';
import { mockStudents } from '../store/mockDb';

export type ItemStatus = 'none' | 'developing' | 'consolidated';

export type StudentData = {
  name: string;
  age: string;
  group: string;
  teacherName: string;
  parentsName: string;
  subject?: string;
  reportTone: 'affectionate' | 'pedagogical' | 'concise';
  generalObservations: string;
  
  // BNCC Fields (Maps item text to status)
  socialMap: Record<string, ItemStatus>;
  fieldSocial: string;
  
  motorMap: Record<string, ItemStatus>;
  fieldMotor: string;
  
  artsMap: Record<string, ItemStatus>;
  fieldArts: string;
  
  languageMap: Record<string, ItemStatus>;
  fieldLanguage: string;
  
  logicMap: Record<string, ItemStatus>;
  fieldLogic: string;
  
  englishMap: Record<string, ItemStatus>;
  fieldEnglish: string;
  
  peMap: Record<string, ItemStatus>;
  fieldPe: string;

  positivePoints: string;
  attentionPoints: string;
  
  photo1?: string; // Base64
  photo2?: string; // Base64
};

interface ReportFormProps {
  onSubmit: (data: StudentData) => void;
  isLoading: boolean;
}

const AGE_GROUPS = [
  { id: 'bebes', label: 'NINHO (Bebês - 0 a 1 ano e 6 meses)' },
  { id: 'pequenas_bem', label: 'G2/G3 (Crianças bem pequenas - 1a 7m a 3a 11m)' },
  { id: 'pequenas', label: 'G4/G5 (Crianças pequenas - 4 a 5 anos e 11 meses)' },
  { id: 'fundamental_1', label: '1º ANO (Ensino Fundamental I)' },
];

const REPORT_CONTEXTS = [
  { id: '1b', label: '1º Bimestre' },
  { id: '2b', label: '2º Bimestre' },
  { id: '3b', label: '3º Bimestre' },
  { id: '4b', label: '4º Bimestre' },
  { id: 'med', label: 'Laudo/Relatório Médico' },
  { id: 'psi', label: 'Relatório Psicopedagógico' },
  { id: 'trans', label: 'Relatório de Transferência' },
  { id: 'outro', label: 'Outros Fins' },
];

import { useAuth } from '../contexts/AuthContext';

export function ReportForm({ onSubmit, isLoading }: ReportFormProps) {
  const { user } = useAuth();
  const [activeGroupId, setActiveGroupId] = useState<'bebes' | 'pequenas_bem' | 'pequenas' | 'fundamental_1'>('bebes');
  const [reportContext, setReportContext] = useState(REPORT_CONTEXTS[0].label);
  
  const [formData, setFormData] = useState<StudentData>({
    name: '',
    age: '',
    group: AGE_GROUPS[0].label,
    teacherName: user?.name || '',
    parentsName: '',
    subject: user?.specialty === 'english' ? 'Inglês' : (user?.specialty === 'pe' ? 'Educação Física' : ''),
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
    photo1: '',
    photo2: ''
  });

  useEffect(() => {
    if (formData.group.includes('NINHO')) setActiveGroupId('bebes');
    else if (formData.group.includes('G2/G3')) setActiveGroupId('pequenas_bem');
    else if (formData.group.includes('G4/G5')) setActiveGroupId('pequenas');
    else if (formData.group.includes('1º ANO')) setActiveGroupId('fundamental_1');
  }, [formData.group]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'name' && value) {
      const student = mockStudents.find(s => s.name === value);
      if (student) {
        const birthYear = new Date(student.birthDate).getUTCFullYear();
        const currentYear = new Date().getFullYear();
        const calculatedAge = (currentYear - birthYear).toString();

        setFormData(prev => ({
          ...prev,
          name: value,
          age: calculatedAge,
          group: student.classId ? (AGE_GROUPS.find(g => g.label.includes(student.classId || ''))?.label || prev.group) : prev.group,
          parentsName: `${student.parent1}${student.parent2 ? ' e ' + student.parent2 : ''}`
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCycleStatus = (mapField: keyof StudentData, item: string) => {
    setFormData(prev => {
      const currentMap = { ...(prev[mapField] as Record<string, ItemStatus>) };
      const currentStatus = currentMap[item] || 'none';
      
      let nextStatus: ItemStatus = 'none';
      if (currentStatus === 'none') nextStatus = 'developing';
      else if (currentStatus === 'developing') nextStatus = 'consolidated';
      else nextStatus = 'none';

      currentMap[item] = nextStatus;
      return { ...prev, [mapField]: currentMap };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo1' | 'photo2') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderField = (title: string, checklistKey: string, mapField: keyof StudentData, textKey: keyof StudentData) => {
    const items = BNCC_CHECKLISTS[activeGroupId][checklistKey as keyof typeof BNCC_CHECKLISTS.bebes] || [];
    const statusMap = (formData[mapField] as Record<string, ItemStatus>) || {};

    return (
      <div className="form-group mb-8" style={{ borderLeft: '4px solid var(--color-primary)', paddingLeft: '1.5rem' }}>
        <label style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {title}
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#fdfdfd', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          {items.map(item => {
            const status = statusMap[item] || 'none';
            let bg = 'transparent';
            let border = 'var(--color-border)';
            let label = 'Não observado';
            
            if (status === 'developing') {
              bg = 'rgba(255, 203, 100, 0.2)';
              border = 'var(--color-accent)';
              label = 'Em desenvolvimento';
            } else if (status === 'consolidated') {
              bg = 'rgba(16, 185, 129, 0.15)';
              border = 'var(--color-success)';
              label = 'Consolidado';
            }

            return (
              <div 
                key={item} 
                onClick={() => handleCycleStatus(mapField, item)}
                style={{ 
                  display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', border: `1px solid ${border}`, 
                  backgroundColor: bg, cursor: 'pointer', transition: 'all 0.2s',
                  userSelect: 'none'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item}</div>
                <div style={{ 
                  fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, 
                  color: status === 'none' ? 'var(--color-text-muted)' : status === 'developing' ? '#b45309' : '#047857'
                }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <MessageSquare size={14} /> Detalhamento Pedagógico / Observações:
        </div>
        <textarea 
          name={textKey as string} 
          value={formData[textKey] as string} 
          onChange={handleChange} 
          placeholder="Descreva avanços específicos ou necessidades de apoio para este campo..."
          style={{ minHeight: '80px' }}
        ></textarea>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ margin: 0 }}>Ficha de Avaliação Individual</h2>
        <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
          <GraduationCap size={16} /> BNCC 2024
        </div>
      </div>
      
      <div className="grid grid-cols-2">
        <div className="form-group">
          <label htmlFor="name">Nome do Aluno *</label>
          <select required id="name" name="name" value={formData.name} onChange={handleChange}>
            <option value="">Selecione um aluno...</option>
            {mockStudents.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="age">Idade *</label>
          <input required type="number" id="age" name="age" value={formData.age} onChange={handleChange} placeholder="Idade atual" />
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="form-group">
          <label htmlFor="group">Turma / Etapa *</label>
          <select required id="group" name="group" value={formData.group} onChange={handleChange}>
            {AGE_GROUPS.map(g => <option key={g.id} value={g.label}>{g.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="reportContext">Finalidade do Relatório</label>
          <select id="reportContext" name="reportContext" value={reportContext} onChange={(e) => setReportContext(e.target.value)}>
            {REPORT_CONTEXTS.map(ctx => <option key={ctx.id} value={ctx.label}>{ctx.label}</option>)}
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
        {(formData.subject !== undefined || user?.role === 'admin' || user?.role === 'coordinator') && (
          <div className="form-group">
            <label htmlFor="subject">Disciplina (Opcional para especialistas)</label>
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
        <textarea id="generalObservations" name="generalObservations" value={formData.generalObservations} onChange={handleChange} placeholder="Como o aluno se integrou ao grupo e participou da rotina escolar neste período?"></textarea>
      </div>

      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '2px dashed var(--color-border)' }} />
      
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare size={24} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Avaliação por Campos de Experiência / Habilidades</h3>
      </div>
      <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
        Clique nos itens para alternar entre: <strong>Não observado</strong> ➔ <strong>Em desenvolvimento</strong> ➔ <strong>Consolidado</strong>.
      </p>

      {/* Conditional Rendering based on Subject */}
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
          <textarea name="positivePoints" value={formData.positivePoints} onChange={handleChange} placeholder="Quais os principais avanços e brilhos do aluno?"></textarea>
        </div>
        
        <div className="form-group">
          <label>Recomendações / Próximos Passos</label>
          <textarea name="attentionPoints" value={formData.attentionPoints} onChange={handleChange} placeholder="Quais estímulos serão priorizados no próximo período?"></textarea>
        </div>
      </div>

      {activeGroupId !== 'fundamental_1' && (
        <div className="grid grid-cols-2 mt-4" style={{ gap: '2rem' }}>
          <div className="form-group">
            <label>Foto do Aluno em Atividade 1</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo1')} style={{ fontSize: '0.8rem' }} />
              {formData.photo1 && <img src={formData.photo1} alt="Preview 1" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--color-border)' }} />}
            </div>
          </div>
          <div className="form-group">
            <label>Foto do Aluno em Atividade 2</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photo2')} style={{ fontSize: '0.8rem' }} />
              {formData.photo2 && <img src={formData.photo2} alt="Preview 2" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--color-border)' }} />}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button type="submit" className="btn btn-primary w-full" disabled={isLoading} style={{ height: '70px', fontSize: '1.25rem', borderRadius: 'var(--radius-xl)' }}>
          {isLoading ? <><span className="loader"></span> Redigindo Relatório Profissional...</> : <><Send size={22} /> Gerar Relatório e Exportar para Word</>}
        </button>
      </div>
    </form>
  );
}
