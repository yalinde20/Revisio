import { Qcm } from '../models/paquet';
import { construireSerie, dureeExamenSecondes, estJuste, formaterDuree, preparerQuestion } from './qcm';

const source = { fichier: 'cours.pdf', lieu: 'p. 1' };
const qcm = (id: string, correctes: boolean[], difficulte: 1 | 2 | 3 = 1): Qcm => ({
  id,
  enonce: id,
  difficulte,
  source,
  options: correctes.map((correcte, i) => ({ texte: `${id}-${i}`, correcte, explication: 'x' })),
});

describe('estJuste', () => {
  const q = preparerQuestion(qcm('q', [true, false, true, false]), () => 0.5);
  const indexDe = (origine: number) => q.options.findIndex((o) => o.indexOrigine === origine);

  it('exige toutes les bonnes réponses et seulement elles', () => {
    expect(estJuste(q, new Set([indexDe(0), indexDe(2)]))).toBeTrue();
    expect(estJuste(q, new Set([indexDe(0)]))).toBeFalse();
    expect(estJuste(q, new Set([indexDe(0), indexDe(2), indexDe(1)]))).toBeFalse();
    expect(estJuste(q, new Set())).toBeFalse();
  });
  it('détecte une question à choix multiple', () => {
    expect(q.multiple).toBeTrue();
    expect(preparerQuestion(qcm('u', [true, false, false])).multiple).toBeFalse();
  });
  it('garde les mêmes options après mélange', () => {
    expect(q.options.map((o) => o.indexOrigine).sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('construireSerie', () => {
  const qcms = [qcm('a', [true, false, false]), qcm('b', [true, false, false]), qcm('c', [true, false, false])];
  const resultats = new Map([
    ['a', { juste: true, date: '2026-11-27' }],
    ['b', { juste: false, date: '2026-11-27' }],
  ]);

  it('ne garde que les erreurs quand on le demande', () => {
    expect(construireSerie(qcms, resultats, { erreursSeulement: true }).map((s) => s.qcm.id)).toEqual(['b']);
  });
  it('limite le nombre de questions en préférant les erreurs, puis les nouvelles, puis les réussies', () => {
    const ids = construireSerie(qcms, resultats, { nombre: 2 }).map((s) => s.qcm.id).sort();
    expect(ids).toEqual(['b', 'c']);
  });
  it('renvoie tout sans limite', () => {
    expect(construireSerie(qcms, new Map()).length).toBe(3);
  });
});

describe('durée', () => {
  it('compte 1 minute par question, 2 pour les difficiles', () => {
    const serie = [qcm('a', [true, false, false], 1), qcm('b', [true, false, false], 3)].map((q) => preparerQuestion(q));
    expect(dureeExamenSecondes(serie)).toBe(180);
  });
  it('formate en minutes et secondes', () => {
    expect(formaterDuree(75)).toBe('1:15');
    expect(formaterDuree(-3)).toBe('0:00');
  });
});
