import { useState } from 'react';
import { Send, FileText, User, Heart, Brain, Activity, UserPlus, CheckCircle } from 'lucide-react';

export type PeiData = {
  name: string;
  age: string;
  group: string;
  diagnosis: string;
  
  // Selection maps
  selectedComm: string[];
  communication: string;
  
  selectedSocial: string[];
  social: string;
  
  selectedBehavior: string[];
  behavior: string;
  
  selectedEmotional: string[];
  emotional: string;
  
  selectedLearning: string[];
  learning: string;
  
  selectedMotor: string[];
  motor: string;
  
  selectedAutonomy: string[];
  autonomy: string;
  
  selectedSensory: string[];
  sensory: string;
};

const PEI_OPTIONS = {
  communication: [
    'Comunicação verbal funcional', 'Usa gestos/apontamento', 'Ecolalia presente', 
    'Dificuldade em iniciar diálogo', 'Comunicação não-verbal', 'Compreende ordens simples',
    'Vocabulário restrito', 'Usa pranchas de comunicação (PECS/outros)'
  ],
  social: [
    'Interage com pares', 'Brinca sozinho', 'Evita contato visual', 
    'Dificuldade em turnos/espera', 'Busca o adulto para ajuda', 'Demonstra empatia',
    'Dificuldade em situações em grupo', 'Interesse por temas específicos'
  ],
  behavior: [
    'Segue rotina com facilidade', 'Resistência a mudanças', 'Autoagressão', 
    'Heteroagressão', 'Estereotipias motoras', 'Fácil distração',
    'Foco excessivo em objetos', 'Responde bem a reforçadores'
  ],
  emotional: [
    'Demonstra segurança', 'Choro excessivo na separação', 'Baixa tolerância à frustração',
    'Apego excessivo a um objeto/pessoa', 'Oscilação de humor', 'Autoestima preservada'
  ],
  learning: [
    'Aprende por via visual', 'Necessita de repetição', 'Interesse em letras/números',
    'Dificuldade em abstração', 'Lento processamento', 'Memória de longo prazo boa'
  ],
  motor: [
    'Preensão correta do lápis', 'Dificuldade em recorte', 'Equilíbrio preservado',
    'Hipotonia', 'Dificuldade em pular/correr', 'Coordenação óculo-manual'
  ],
  autonomy: [
    'Usa o banheiro sozinho', 'Necessita auxílio na alimentação', 'Organiza seus pertences',
    'Veste-se com auxílio', 'Identifica perigos', 'Pede ajuda quando necessário'
  ],
  sensory: [
    'Hipersensibilidade auditiva', 'Busca sensorial (tátil)', 'Seletividade alimentar',
    'Incomodo com luzes forte', 'Não gosta de se sujar', 'Gosta de pressão profunda'
  ]
};

interface PeiFormProps {
  onSubmit: (data: PeiData) => void;
  isLoading: boolean;
}

export function PeiForm({ onSubmit, isLoading }: PeiFormProps) {
  const [formData, setFormData] = useState<PeiData>({
    name: '', age: '', group: '', diagnosis: '',
    selectedComm: [], communication: '',
    selectedSocial: [], social: '',
    selectedBehavior: [], behavior: '',
    selectedEmotional: [], emotional: '',
    selectedLearning: [], learning: '',
    selectedMotor: [], motor: '',
    selectedAutonomy: [], autonomy: '',
    selectedSensory: [], sensory: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleOption = (field: keyof PeiData, option: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(option) ? current.filter(o => o !== option) : [...current, option]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderSection = (title: string, optionsKey: keyof typeof PEI_OPTIONS, selectField: keyof PeiData, textField: keyof PeiData, icon: any) => (
    <div className="mb-8" style={{ borderLeft: '4px solid var(--color-secondary)', paddingLeft: '1.5rem' }}>
      <label className="flex items-center gap-2 mb-3" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
        {icon} {title}
      </label>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {PEI_OPTIONS[optionsKey].map(opt => {
          const isSelected = (formData[selectField] as string[]).includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(selectField, opt)}
              style={{
                padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid',
                borderColor: isSelected ? 'var(--color-secondary)' : 'var(--color-border)',
                backgroundColor: isSelected ? 'rgba(253, 133, 45, 0.1)' : 'var(--color-bg)',
                color: isSelected ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', fontWeight: isSelected ? 600 : 400
              }}
            >
              {isSelected && <CheckCircle size={12} style={{ marginRight: '4px' }} />}
              {opt}
            </button>
          );
        })}
      </div>

      <textarea 
        name={textField as string} 
        value={formData[textField] as string} 
        onChange={handleChange} 
        placeholder="Detalhes adicionais ou observações específicas..."
        style={{ minHeight: '80px' }}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex items-center gap-2 mb-6">
        <FileText size={24} color="var(--color-secondary)" />
        <h2 style={{ margin: 0 }}>Gerador de PEI Profissional</h2>
      </div>

      <div className="grid grid-cols-2">
        <div className="form-group">
          <label>Nome do Aluno *</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Idade *</label>
          <input type="number" name="age" value={formData.age} onChange={handleChange} required />
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="form-group">
          <label>Turma *</label>
          <input type="text" name="group" value={formData.group} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Diagnóstico Principal</label>
          <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} placeholder="Ex: TEA Nível 1" />
        </div>
      </div>

      <hr className="my-8" style={{ border: 'none', borderTop: '2px dashed var(--color-border)' }} />
      <p className="text-muted mb-6">Selecione os indicadores observados e adicione detalhes para cada eixo:</p>

      {renderSection('Comunicação e Linguagem', 'communication', 'selectedComm', 'communication', <Send size={18} />)}
      {renderSection('Interação Social', 'social', 'selectedSocial', 'social', <UserPlus size={18} />)}
      {renderSection('Comportamento e Flexibilidade', 'behavior', 'selectedBehavior', 'behavior', <Activity size={18} />)}
      {renderSection('Aspectos Emocionais', 'emotional', 'selectedEmotional', 'emotional', <Heart size={18} />)}
      {renderSection('Processos de Aprendizagem', 'learning', 'selectedLearning', 'learning', <Brain size={18} />)}
      {renderSection('Desenvolvimento Motor', 'motor', 'selectedMotor', 'motor', <Activity size={18} />)}
      {renderSection('Autonomia e Vida Diária', 'autonomy', 'selectedAutonomy', 'autonomy', <User size={18} />)}
      {renderSection('Perfil Sensorial', 'sensory', 'selectedSensory', 'sensory', <Activity size={18} />)}

      <div className="flex justify-center mt-8">
        <button type="submit" className="btn btn-secondary w-full" disabled={isLoading} style={{ height: '70px', fontSize: '1.2rem', borderRadius: 'var(--radius-xl)' }}>
          {isLoading ? <><span className="loader"></span> Estruturando PEI (Prazos: Trimestre/Semestre/Ano)...</> : <><Brain size={22} /> Gerar PEI com Metas Estruturadas</>}
        </button>
      </div>
    </form>
  );
}
