import { Card } from 'ts-fsrs';
import { Carte } from '../models/paquet';

export const MAX_NOUVELLES_PAR_SEANCE = 20;
export const MAX_REVISIONS_PAR_SEANCE = 100;

export interface CompteurCours {
  nouvelles: number;
  aRevoir: number;
  /** Cartes déjà vues et pas encore à revoir. */
  enAttente: number;
}

export function compter(cartes: Carte[], etats: Map<string, Card>, maintenant: Date): CompteurCours {
  let nouvelles = 0;
  let aRevoir = 0;
  let enAttente = 0;
  for (const c of cartes) {
    const etat = etats.get(c.id);
    if (!etat) nouvelles++;
    else if (etat.due.getTime() <= maintenant.getTime()) aRevoir++;
    else enAttente++;
  }
  return { nouvelles, aRevoir, enAttente };
}

/** Mélange de Fisher-Yates (le hasard est injectable pour les tests). */
export function melanger<T>(liste: readonly T[], alea: () => number = Math.random): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Cartes d'une séance : celles à revoir (échues, les plus en retard d'abord si on dépasse
 * le plafond) plus des nouvelles, le tout dans un ordre aléatoire.
 */
export function construireSeance(
  cartes: Carte[],
  etats: Map<string, Card>,
  maintenant: Date,
  options: { maxNouvelles?: number; maxRevisions?: number; alea?: () => number } = {},
): Carte[] {
  const { maxNouvelles = MAX_NOUVELLES_PAR_SEANCE, maxRevisions = MAX_REVISIONS_PAR_SEANCE, alea } = options;
  const echues = cartes
    .filter((c) => {
      const e = etats.get(c.id);
      return e !== undefined && e.due.getTime() <= maintenant.getTime();
    })
    .sort((a, b) => etats.get(a.id)!.due.getTime() - etats.get(b.id)!.due.getTime())
    .slice(0, maxRevisions);
  const nouvelles = melanger(
    cartes.filter((c) => !etats.has(c.id)),
    alea,
  ).slice(0, maxNouvelles);
  return melanger([...echues, ...nouvelles], alea);
}
