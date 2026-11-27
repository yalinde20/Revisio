/**
 * Types du paquet de cours. Reflètent `schema/paquet.schema.json` (schemaVersion 1),
 * le format produit par la commande /reviser du Jarvis.
 */
export interface Source {
  fichier: string;
  lieu?: string;
}

export type Origine = 'cours' | 'notes_perso' | 'bonus';

interface ElementBase {
  id: string;
  tags?: string[];
  source: Source;
  aVerifier?: boolean;
  origine?: Origine;
}

export interface CarteVraiFaux extends ElementBase {
  type: 'vrai_faux';
  enonce: string;
  vrai: boolean;
  explication: string;
}

export interface CarteReponseCourte extends ElementBase {
  type: 'reponse_courte';
  enonce: string;
  /** Réponses acceptées, la première est celle affichée. */
  reponses: string[];
  explication: string;
}

export type Carte = CarteVraiFaux | CarteReponseCourte;

export interface OptionQcm {
  texte: string;
  correcte: boolean;
  explication: string;
}

export interface Qcm extends ElementBase {
  enonce: string;
  options: OptionQcm[];
  difficulte: 1 | 2 | 3;
}

export type TypeExercice = 'question' | 'prediction' | 'requete' | 'parsons' | 'debogage' | 'calcul';

export interface Exercice extends ElementBase {
  type: TypeExercice;
  titre: string;
  enonce: string;
  donnees?: string;
  lignes?: string[];
  distracteurs?: string[];
  indices?: string[];
  correction: string;
  difficulte: 1 | 2 | 3;
}

export interface PaquetSource {
  fichier: string;
  type: 'pdf' | 'docx' | 'md' | 'txt' | 'image' | 'autre';
  pages?: string;
}

export interface Paquet {
  schemaVersion: 1;
  id: string;
  matiere: string;
  titre: string;
  description?: string;
  genereLe: string;
  sources: PaquetSource[];
  cartes: Carte[];
  qcm: Qcm[];
  exercices: Exercice[];
  fiche: string;
  carteMentale: string;
  pointsAVerifier: { texte: string; source?: Source }[];
}

/** Ligne du catalogue (fichier `content/index.json`, produit par `npm run indexer`). */
export interface EntreeCatalogue {
  id: string;
  matiere: string;
  titre: string;
  genereLe: string;
  nbCartes: number;
  nbQcm: number;
  nbExercices: number;
}
