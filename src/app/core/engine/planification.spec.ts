import { State, deserialiser, nouvelleCarte, planifier, serialiser } from './planification';

const t0 = new Date('2026-11-27T10:00:00Z');

describe('planifier (FSRS)', () => {
  it('une bonne réponse repousse la révision plus loin qu\'une mauvaise', () => {
    const bonne = planifier(undefined, true, t0);
    const mauvaise = planifier(undefined, false, t0);
    expect(bonne.due.getTime()).toBeGreaterThan(mauvaise.due.getTime());
  });

  it('les intervalles s\'allongent quand on réussit à chaque révision', () => {
    let carte = planifier(undefined, true, t0);
    let maintenant = carte.due;
    const intervalles: number[] = [];
    for (let i = 0; i < 4; i++) {
      const suivante = planifier(carte, true, maintenant);
      intervalles.push(suivante.due.getTime() - maintenant.getTime());
      carte = suivante;
      maintenant = suivante.due;
    }
    expect(intervalles[3]).toBeGreaterThan(intervalles[0]);
  });

  it("une erreur sur une carte apprise la fait revenir bien plus tôt qu'une réussite", () => {
    let carte = planifier(undefined, true, t0);
    for (let i = 0; i < 3; i++) carte = planifier(carte, true, carte.due);
    const apresReussite = planifier(carte, true, carte.due);
    const apresOubli = planifier(carte, false, carte.due);
    expect(apresOubli.lapses).toBe(1);
    expect(apresOubli.due.getTime()).toBeLessThan(apresReussite.due.getTime());
  });
});

describe('sérialisation', () => {
  it('fait l\'aller-retour sans perdre les dates', () => {
    const carte = planifier(nouvelleCarte(t0), true, t0);
    const retour = deserialiser(JSON.parse(JSON.stringify(serialiser(carte))));
    expect(retour.due.getTime()).toBe(carte.due.getTime());
    expect(retour.last_review?.getTime()).toBe(carte.last_review?.getTime());
    expect(retour.stability).toBe(carte.stability);
  });
});
