import { Card } from 'ts-fsrs';
import { Carte } from '../models/paquet';
import { nouvelleCarte } from './planification';
import { compter, construireSeance, melanger } from './seance';

const source = { fichier: 'cours.pdf', lieu: 'p. 1' };
const carte = (id: string): Carte => ({ id, type: 'vrai_faux', enonce: id, vrai: true, explication: 'x', source });
const cartes = ['a', 'b', 'c', 'd', 'e'].map(carte);
const maintenant = new Date('2026-11-27T10:00:00Z');

function etat(dueDansJours: number): Card {
  const c = nouvelleCarte(maintenant);
  return { ...c, due: new Date(maintenant.getTime() + dueDansJours * 86_400_000) };
}

describe('compter', () => {
  it('sépare nouvelles, à revoir et en attente', () => {
    const etats = new Map([
      ['a', etat(-1)],
      ['b', etat(3)],
    ]);
    expect(compter(cartes, etats, maintenant)).toEqual({ nouvelles: 3, aRevoir: 1, enAttente: 1 });
  });
});

describe('construireSeance', () => {
  const etats = new Map([
    ['a', etat(-2)],
    ['b', etat(5)],
  ]);

  it("contient les cartes échues et les nouvelles, pas celles qui ne sont pas encore dues", () => {
    const ids = construireSeance(cartes, etats, maintenant).map((c) => c.id).sort();
    expect(ids).toEqual(['a', 'c', 'd', 'e']);
  });
  it('plafonne le nombre de nouvelles cartes', () => {
    const seance = construireSeance(cartes, etats, maintenant, { maxNouvelles: 1 });
    expect(seance.length).toBe(2);
    expect(seance.some((c) => c.id === 'a')).toBeTrue();
  });
  it('est vide quand tout est en attente', () => {
    const tout = new Map(cartes.map((c) => [c.id, etat(2)] as const));
    expect(construireSeance(cartes, tout, maintenant)).toEqual([]);
  });
});

describe('melanger', () => {
  it('garde les mêmes éléments et ne modifie pas la liste d\'origine', () => {
    const origine = [1, 2, 3, 4, 5];
    const m = melanger(origine, () => 0.3);
    expect([...m].sort()).toEqual(origine);
    expect(origine).toEqual([1, 2, 3, 4, 5]);
  });
});
