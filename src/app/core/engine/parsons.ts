import { melanger } from './seance';

export interface LigneParsons {
  /** Identifiant stable pendant l'exercice (deux lignes peuvent avoir le même texte). */
  id: number;
  texte: string;
}

/** Lignes à ordonner : les vraies lignes plus les distracteurs, mélangées. */
export function preparerParsons(lignes: string[], distracteurs: string[] = [], alea?: () => number): LigneParsons[] {
  const toutes = [...lignes, ...distracteurs].map((texte, id) => ({ id, texte }));
  return melanger(toutes, alea);
}

/**
 * Compare la proposition (liste de lignes choisies, dans l'ordre) à la solution.
 * Renvoie, pour chaque position proposée, si elle est correcte, et si la proposition est complète.
 */
export function verifierParsons(solution: string[], proposees: LigneParsons[]): { positions: boolean[]; reussi: boolean } {
  const positions = proposees.map((l, i) => l.texte === solution[i]);
  return { positions, reussi: proposees.length === solution.length && positions.every(Boolean) };
}
