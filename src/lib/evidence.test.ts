import { describe, expect, it } from 'vitest';
import { citedNumbers, citedObservationIds, stripCitations } from './evidence';

describe('evidência citada no texto', () => {
  const text = 'Ana pediu a palavra na roda [2]. Esperou a vez [2][5]. Sem registro em Corpo e movimento.';

  it('remove os marcadores sem deixar espaço antes da pontuação', () => {
    expect(stripCitations(text)).toBe('Ana pediu a palavra na roda. Esperou a vez. Sem registro em Corpo e movimento.');
  });

  it('lista os números citados na ordem, sem repetir', () => {
    expect(citedNumbers(text)).toEqual([2, 5]);
  });

  it('traduz números em ids pelo mapa do servidor, ignorando os desconhecidos', () => {
    expect(citedObservationIds(text, { '2': 'obs-b', '9': 'obs-x' })).toEqual(['obs-b']);
    expect(citedObservationIds(text, undefined)).toEqual([]);
  });
});
