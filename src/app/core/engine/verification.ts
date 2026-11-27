/**
 * Vérification d'une réponse courte tapée par l'élève.
 * Tolère la casse, les accents, les espaces en trop, les articles, les parenthèses vides
 * (« newInstance() » = « newInstance ») et une faute de frappe sur les mots assez longs.
 */
export type ResultatVerification = 'exacte' | 'proche' | 'fausse';

const ARTICLES = /^(le|la|les|l'|un|une|des|du|de la|de l')\s*/;

export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\(\s*\)/g, '')
    .replace(/[.,;:!?"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(ARTICLES, '')
    .trim();
}

export function distanceLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let precedent = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const courant = [i];
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courant[j] = Math.min(precedent[j] + 1, courant[j - 1] + 1, precedent[j - 1] + cout);
    }
    precedent = courant;
  }
  return precedent[b.length];
}

/** Nombre de fautes de frappe tolérées selon la longueur de la réponse attendue. */
function toleranceFautes(longueur: number): number {
  if (longueur >= 12) return 2;
  if (longueur >= 6) return 1;
  return 0;
}

export function verifierReponse(saisie: string, reponsesAcceptees: string[]): ResultatVerification {
  const s = normaliser(saisie);
  if (s === '') return 'fausse';
  const attendues = reponsesAcceptees.map(normaliser).filter((r) => r !== '');
  if (attendues.includes(s)) return 'exacte';
  const proche = attendues.some(
    (r) => distanceLevenshtein(s, r) <= toleranceFautes(Math.min(r.length, s.length)),
  );
  return proche ? 'proche' : 'fausse';
}
