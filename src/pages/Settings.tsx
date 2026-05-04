import { useState, useEffect } from 'react';
import { Key, Bot, Save } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

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
          <div className="form-group">
            <label htmlFor="provider">Provedor de IA</label>
            <select 
              id="provider" 
              value={provider} 
              onChange={e => setProvider(e.target.value as any)}
              style={{ maxWidth: '300px' }}
            >
              <option value="gemini">Google Gemini (Grátis/Recomendado)</option>
              <option value="openai">ChatGPT / OpenAI</option>
            </select>
          </div>

          <div className="form-group mt-4">
            <label htmlFor="modelName">Nome do Modelo (ID)</label>
            <input 
              type="text" 
              id="modelName" 
              value={modelName} 
              onChange={e => setModelName(e.target.value)} 
              placeholder={provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
            />
            <small className="text-muted mt-2" style={{ display: 'block' }}>
              Padrão Gemini: <code>gemini-1.5-flash</code> ou <code>gemini-pro</code>. <br/>
              Padrão OpenAI: <code>gpt-4o-mini</code> ou <code>gpt-4-turbo</code>.
            </small>
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
