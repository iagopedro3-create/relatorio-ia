import { useState, useEffect } from 'react';
import { Key, Bot, Save, Sparkles, Zap, Brain, Crown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Rápido e eficiente — ideal para relatórios', recommended: true },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', desc: 'Mais recente, com capacidade de raciocínio avançado', recommended: false },
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', desc: 'Máxima qualidade — textos mais elaborados', recommended: false },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Modelo estável, boa relação custo-benefício', recommended: false },
];

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Rápido e barato — bom para uso diário', recommended: true },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Modelo premium — textos de alta qualidade', recommended: false },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'Potente, com contexto estendido', recommended: false },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Econômico — mais simples porém funcional', recommended: false },
];

export function Settings() {
  const { settings, updateSettings } = useSettings();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [provider, setProvider] = useState(settings.aiProvider);
  const [modelName, setModelName] = useState(settings.aiModel);
  const [saved, setSaved] = useState(false);

  // Sync state with context if it changes elsewhere
  useEffect(() => {
    setApiKey(settings.apiKey);
    setProvider(settings.aiProvider);
    setModelName(settings.aiModel);
  }, [settings]);

  const handleProviderChange = (newProvider: 'gemini' | 'openai') => {
    setProvider(newProvider);
    // Auto-select recommended model for the new provider
    const models = newProvider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
    const recommended = models.find(m => m.recommended) || models[0];
    setModelName(recommended.id);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiKey,
      aiProvider: provider,
      aiModel: modelName,
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentModels = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="mb-4">Configurações do Sistema</h2>

      <div className="card">
        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-primary)' }}>
          <Bot size={24} />
          <h3 style={{ margin: 0 }}>Motor de Inteligência Artificial</h3>
        </div>
        
        <p className="text-muted mb-4">
          Configure a inteligência artificial que irá gerar os relatórios da escola. 
          Ao salvar aqui, todos os professores utilizarão esta mesma chave sem precisarem configurar nada.
        </p>

        <form onSubmit={handleSave}>
          {/* Provider Selection - visual cards */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Provedor de IA</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                style={{
                  padding: '1rem 1.25rem', borderRadius: '12px', cursor: 'pointer',
                  border: provider === 'gemini' ? '2px solid #4285f4' : '2px solid #e2e8f0',
                  backgroundColor: provider === 'gemini' ? '#eef4ff' : 'white',
                  textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <Sparkles size={20} color={provider === 'gemini' ? '#4285f4' : '#94a3b8'} />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: provider === 'gemini' ? '#1a56db' : '#334155' }}>Google Gemini</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Grátis • Recomendado para escolas</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                style={{
                  padding: '1rem 1.25rem', borderRadius: '12px', cursor: 'pointer',
                  border: provider === 'openai' ? '2px solid #10a37f' : '2px solid #e2e8f0',
                  backgroundColor: provider === 'openai' ? '#f0fdf9' : 'white',
                  textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <Brain size={20} color={provider === 'openai' ? '#10a37f' : '#94a3b8'} />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: provider === 'openai' ? '#047857' : '#334155' }}>ChatGPT / OpenAI</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Pago • Alta qualidade de texto</span>
              </button>
            </div>
          </div>

          {/* Model Selection - visual grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              Modelo {provider === 'gemini' ? 'Gemini' : 'OpenAI'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {currentModels.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModelName(m.id)}
                  style={{
                    padding: '0.85rem 1rem', borderRadius: '10px', cursor: 'pointer',
                    border: modelName === m.id
                      ? `2px solid ${provider === 'gemini' ? '#4285f4' : '#10a37f'}`
                      : '2px solid #e2e8f0',
                    backgroundColor: modelName === m.id
                      ? (provider === 'gemini' ? '#eef4ff' : '#f0fdf9')
                      : '#fafafa',
                    textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit',
                    position: 'relative',
                  }}
                >
                  {m.recommended && (
                    <span style={{
                      position: 'absolute', top: '-8px', right: '10px',
                      fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                      padding: '0.1rem 0.5rem', borderRadius: '4px', letterSpacing: '0.5px',
                      backgroundColor: provider === 'gemini' ? '#4285f4' : '#10a37f',
                      color: 'white',
                    }}>
                      Recomendado
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {m.recommended ? <Crown size={14} color={provider === 'gemini' ? '#4285f4' : '#10a37f'} /> : <Zap size={14} color="#94a3b8" />}
                    <span style={{
                      fontWeight: 700, fontSize: '0.85rem',
                      color: modelName === m.id ? '#1e293b' : '#475569',
                    }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.3 }}>{m.desc}</span>
                  <div style={{ marginTop: '0.4rem' }}>
                    <code style={{
                      fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                      backgroundColor: modelName === m.id ? 'rgba(0,0,0,0.06)' : '#f1f5f9',
                      color: '#64748b', fontFamily: 'monospace',
                    }}>{m.id}</code>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mt-4">
            <label htmlFor="apiKey" className="flex items-center gap-2">
              <Key size={16} /> Chave de API (Secret Key)
            </label>
            <input 
              type="password" 
              id="apiKey" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              style={{ fontFamily: 'monospace' }}
            />
            <small className="text-muted mt-2" style={{ display: 'block' }}>
              {provider === 'gemini' 
                ? 'Você pode gerar uma chave gratuita no Google AI Studio.' 
                : 'Você precisa de uma conta com saldo na plataforma de desenvolvedores da OpenAI.'}
            </small>
          </div>

          <button type="submit" className="btn btn-primary mt-4">
            <Save size={18} /> Salvar Configurações
          </button>

          {saved && (
            <span style={{ marginLeft: '1rem', color: 'var(--color-success)', fontWeight: 600 }}>
              Configurações salvas com sucesso!
            </span>
          )}
        </form>
      </div>
    </div>
  );
}
