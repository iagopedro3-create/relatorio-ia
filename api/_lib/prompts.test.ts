import { describe, expect, it } from 'vitest';
import { splitPeiOutput } from './prompts';

describe('splitPeiOutput', () => {
  it('separa o texto do JSON de metas', () => {
    const raw = '## PERFIL\nTexto [1].\n\n<<<METAS>>>\n{"goals":[{"axis":"Comunicação","title":"Pedir ajuda com palavras","criterion":"8 de 10","context":"na roda","term":"curto"}]}';
    const out = splitPeiOutput(raw);
    expect(out.content).toBe('## PERFIL\nTexto [1].');
    expect(out.goals).toEqual([{ axis: 'Comunicação', title: 'Pedir ajuda com palavras', criterion: '8 de 10', context: 'na roda', term: 'curto' }]);
  });

  it('aceita cercas de código e prazo mal escrito; normaliza', () => {
    const raw = 'Texto\n<<<METAS>>>\n```json\n{"goals":[{"axis":"","title":"Meta","term":"Longo prazo"}]}\n```';
    const out = splitPeiOutput(raw);
    expect(out.goals[0]).toMatchObject({ axis: 'Geral', title: 'Meta', term: 'longo' });
  });

  it('sem marcador ou com JSON quebrado, devolve o texto e nenhuma meta', () => {
    expect(splitPeiOutput('Só texto')).toEqual({ content: 'Só texto', goals: [] });
    expect(splitPeiOutput('Texto\n<<<METAS>>>\n{"goals": [')).toEqual({ content: 'Texto', goals: [] });
  });
});
