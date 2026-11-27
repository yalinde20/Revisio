import { Card, Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs';

/**
 * Répétition espacée FSRS (même famille d'algorithme que celui d'Anki).
 * La carte FSRS est stockée en JSON : les dates passent en chaînes ISO.
 */
export interface CarteFsrsJson {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
}

const planificateur = fsrs(generatorParameters({
  enable_fuzz: true,
  // Pas de petites étapes de minutes comme dans Anki : une carte réussie repart en jours,
  // une carte ratée est de toute façon reposée une fois en fin de séance (voir seance-cartes-page).
  enable_short_term: false,
}));

export function nouvelleCarte(maintenant: Date): Card {
  return createEmptyCard<Card>(maintenant);
}

/** Note une réponse : juste = Good, fausse = Again. Renvoie la nouvelle carte FSRS. */
export function planifier(carte: Card | undefined, juste: boolean, maintenant: Date): Card {
  const base: Card = carte ?? nouvelleCarte(maintenant);
  return planificateur.next(base, maintenant, juste ? Rating.Good : Rating.Again).card;
}

export function serialiser(carte: Card): CarteFsrsJson {
  return {
    due: carte.due.toISOString(),
    stability: carte.stability,
    difficulty: carte.difficulty,
    elapsed_days: carte.elapsed_days,
    scheduled_days: carte.scheduled_days,
    learning_steps: carte.learning_steps,
    reps: carte.reps,
    lapses: carte.lapses,
    state: carte.state,
    last_review: carte.last_review?.toISOString(),
  };
}

export function deserialiser(json: CarteFsrsJson): Card {
  return {
    ...json,
    due: new Date(json.due),
    last_review: json.last_review ? new Date(json.last_review) : undefined,
  };
}

export { State };
