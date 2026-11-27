import { Qcm } from '../models/paquet';
import { melanger } from './seance';

export interface OptionAffichee {
  texte: string;
  correcte: boolean;
  explication: string;
  /** Position de l'option dans le paquet (l'ordre affiché est mélangé). */
  indexOrigine: number;
}

export interface QuestionAffichee {
  qcm: Qcm;
  options: OptionAffichee[];
  /** Plusieurs bonnes réponses : l'élève doit cocher toutes les bonnes et seulement elles. */
  multiple: boolean;
}

export type ModeQcm = 'entrainement' | 'examen';

export interface ResultatQcm {
  juste: boolean;
  date: string;
}

/** Une question est juste si la sélection est exactement l'ensemble des bonnes réponses. */
export function estJuste(question: QuestionAffichee, selection: ReadonlySet<number>): boolean {
  return question.options.every((o, i) => o.correcte === selection.has(i));
}

export function preparerQuestion(qcm: Qcm, alea?: () => number): QuestionAffichee {
  const options = melanger(
    qcm.options.map((o, indexOrigine) => ({ ...o, indexOrigine })),
    alea,
  );
  return { qcm, options, multiple: qcm.options.filter((o) => o.correcte).length > 1 };
}

/**
 * Choix des questions d'une série. `erreursSeulement` ne garde que les questions dont la
 * dernière réponse était fausse. Les questions jamais faites passent avant les déjà réussies.
 */
export function construireSerie(
  qcms: Qcm[],
  resultats: Map<string, ResultatQcm>,
  options: { nombre?: number; erreursSeulement?: boolean; alea?: () => number } = {},
): QuestionAffichee[] {
  const { nombre, erreursSeulement = false, alea } = options;
  let candidats = qcms;
  if (erreursSeulement) candidats = qcms.filter((q) => resultats.get(q.id)?.juste === false);
  const priorite = (q: Qcm) => (resultats.has(q.id) ? (resultats.get(q.id)!.juste ? 2 : 0) : 1);
  const tries = melanger(candidats, alea).sort((a, b) => priorite(a) - priorite(b));
  const retenus = nombre === undefined ? tries : tries.slice(0, nombre);
  return melanger(retenus, alea).map((q) => preparerQuestion(q, alea));
}

/** Durée allouée en mode examen : 1 minute par question, 2 pour les plus difficiles. */
export function dureeExamenSecondes(questions: QuestionAffichee[]): number {
  return questions.reduce((total, q) => total + (q.qcm.difficulte === 3 ? 120 : 60), 0);
}

export function formaterDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
