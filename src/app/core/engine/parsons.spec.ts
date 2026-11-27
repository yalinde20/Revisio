import { preparerParsons, verifierParsons } from './parsons';

describe('Parsons', () => {
  const solution = ['a', 'b', 'c'];

  it('mélange les lignes et les distracteurs sans en perdre', () => {
    const lignes = preparerParsons(solution, ['x'], () => 0.1);
    expect(lignes.map((l) => l.texte).sort()).toEqual(['a', 'b', 'c', 'x']);
    expect(new Set(lignes.map((l) => l.id)).size).toBe(4);
  });
  it('valide le bon ordre', () => {
    const l = preparerParsons(solution);
    const dans = (t: string) => l.find((x) => x.texte === t)!;
    expect(verifierParsons(solution, [dans('a'), dans('b'), dans('c')]).reussi).toBeTrue();
  });
  it('signale les positions fausses et refuse un ordre incomplet', () => {
    const l = preparerParsons(solution);
    const dans = (t: string) => l.find((x) => x.texte === t)!;
    const r = verifierParsons(solution, [dans('a'), dans('c'), dans('b')]);
    expect(r.positions).toEqual([true, false, false]);
    expect(r.reussi).toBeFalse();
    expect(verifierParsons(solution, [dans('a'), dans('b')]).reussi).toBeFalse();
  });
});
