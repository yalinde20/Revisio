#!/usr/bin/env node
// Contrôle d'un paquet de cours (voir paquet.schema.json). Sans dépendance.
// Usage : node controles.mjs chemin/vers/paquet.json
// Sortie : erreurs (code 1) ou avertissements, puis un résumé.
// Ce script applique les règles essentielles du schéma. Le schéma reste la référence ;
// l'app web le validera avec ajv.
import { readFileSync } from 'node:fs';

const fichier = process.argv[2];
if (!fichier) {
  console.error('Usage : node controles.mjs paquet.json');
  process.exit(2);
}

let p;
try {
  p = JSON.parse(readFileSync(fichier, 'utf8'));
} catch (e) {
  console.error(`JSON illisible : ${e.message}`);
  process.exit(1);
}

const erreurs = [];
const avertissements = [];
const err = (m) => erreurs.push(m);
const warn = (m) => avertissements.push(m);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ORIGINES = ['cours', 'notes_perso', 'bonus'];
const EXO_TYPES = ['question', 'prediction', 'requete', 'parsons', 'debogage', 'calcul'];
const SRC_TYPES = ['pdf', 'docx', 'md', 'txt', 'image', 'autre'];

const CLES = {
  racine: ['schemaVersion', 'id', 'matiere', 'titre', 'description', 'genereLe', 'sources', 'cartes', 'qcm', 'exercices', 'fiche', 'carteMentale', 'pointsAVerifier'],
  carte: ['id', 'type', 'enonce', 'vrai', 'reponses', 'explication', 'tags', 'source', 'aVerifier', 'origine'],
  qcm: ['id', 'enonce', 'options', 'difficulte', 'tags', 'source', 'aVerifier', 'origine'],
  exercice: ['id', 'type', 'titre', 'enonce', 'donnees', 'lignes', 'distracteurs', 'indices', 'correction', 'difficulte', 'tags', 'source', 'aVerifier', 'origine'],
  option: ['texte', 'correcte', 'explication'],
};

const chaine = (v) => typeof v === 'string' && v.trim().length > 0;
const cles = (o, permises, ou) => {
  for (const k of Object.keys(o)) if (!permises.includes(k)) err(`${ou} : clé inconnue « ${k} »`);
};

// Racine
if (typeof p !== 'object' || p === null || Array.isArray(p)) {
  err('la racine doit être un objet');
} else {
  cles(p, CLES.racine, 'racine');
  if (p.schemaVersion !== 1) err('schemaVersion doit valoir 1');
  if (!SLUG.test(p.id ?? '')) err(`id invalide « ${p.id} » (minuscules, chiffres et tirets)`);
  for (const k of ['matiere', 'titre', 'fiche', 'carteMentale']) if (!chaine(p[k])) err(`${k} manquant ou vide`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.genereLe ?? '')) err('genereLe doit être une date AAAA-MM-JJ');
  for (const k of ['sources', 'cartes', 'qcm', 'exercices', 'pointsAVerifier']) if (!Array.isArray(p[k])) err(`${k} doit être un tableau`);
}

const sources = Array.isArray(p?.sources) ? p.sources : [];
if (sources.length === 0) err('au moins une source est requise');
const fichiersConnus = new Set();
sources.forEach((s, i) => {
  if (!chaine(s?.fichier)) return err(`sources[${i}] : fichier manquant`);
  if (/[\\/]/.test(s.fichier)) err(`sources[${i}] : « ${s.fichier} » est un chemin, mettre le nom du fichier seul`);
  if (!SRC_TYPES.includes(s.type)) err(`sources[${i}] : type invalide « ${s.type} »`);
  fichiersConnus.add(s.fichier);
});

const ids = new Map();
function verifierCommun(x, ou) {
  if (!SLUG.test(x?.id ?? '')) err(`${ou} : id invalide « ${x?.id} »`);
  else if (ids.has(x.id)) err(`${ou} : id « ${x.id} » déjà utilisé par ${ids.get(x.id)}`);
  else ids.set(x.id, ou);
  if (!chaine(x?.source?.fichier)) err(`${ou} : source.fichier manquant`);
  else if (!fichiersConnus.has(x.source.fichier)) err(`${ou} : source « ${x.source.fichier} » absente de sources[]`);
  else if (!chaine(x.source.lieu)) warn(`${ou} : source.lieu vide (page ou slide à indiquer)`);
  if (x?.origine !== undefined && !ORIGINES.includes(x.origine)) err(`${ou} : origine invalide « ${x.origine} »`);
  if (x?.aVerifier !== undefined && typeof x.aVerifier !== 'boolean') err(`${ou} : aVerifier doit être un booléen`);
}

// Cartes
let nbVrai = 0;
let nbFaux = 0;
(p?.cartes ?? []).forEach((c, i) => {
  const ou = `cartes[${i}]`;
  cles(c, CLES.carte, ou);
  verifierCommun(c, ou);
  if (!chaine(c.enonce)) err(`${ou} : enonce vide`);
  if (!chaine(c.explication)) err(`${ou} : explication vide`);
  if (c.type === 'vrai_faux') {
    if (typeof c.vrai !== 'boolean') err(`${ou} : vrai (booléen) requis pour un vrai_faux`);
    else c.vrai ? nbVrai++ : nbFaux++;
    if ('reponses' in c) err(`${ou} : reponses interdit pour un vrai_faux`);
  } else if (c.type === 'reponse_courte') {
    if (!Array.isArray(c.reponses) || c.reponses.length === 0 || !c.reponses.every(chaine)) err(`${ou} : reponses (liste non vide) requis pour une reponse_courte`);
    if ('vrai' in c) err(`${ou} : vrai interdit pour une reponse_courte`);
  } else err(`${ou} : type invalide « ${c.type} »`);
});

// QCM
(p?.qcm ?? []).forEach((q, i) => {
  const ou = `qcm[${i}]`;
  cles(q, CLES.qcm, ou);
  verifierCommun(q, ou);
  if (!chaine(q.enonce)) err(`${ou} : enonce vide`);
  if (![1, 2, 3].includes(q.difficulte)) err(`${ou} : difficulte doit valoir 1, 2 ou 3`);
  const o = q.options;
  if (!Array.isArray(o) || o.length < 3 || o.length > 6) return err(`${ou} : entre 3 et 6 options`);
  o.forEach((x, j) => {
    cles(x, CLES.option, `${ou}.options[${j}]`);
    if (!chaine(x.texte)) err(`${ou}.options[${j}] : texte vide`);
    if (typeof x.correcte !== 'boolean') err(`${ou}.options[${j}] : correcte (booléen) requis`);
    if (!chaine(x.explication)) err(`${ou}.options[${j}] : explication vide`);
  });
  const bonnes = o.filter((x) => x.correcte === true).length;
  if (bonnes === 0) err(`${ou} : aucune bonne réponse`);
  if (bonnes === o.length) err(`${ou} : toutes les options sont correctes`);
  const textes = o.map((x) => x.texte?.trim().toLowerCase());
  if (new Set(textes).size !== textes.length) err(`${ou} : deux options identiques`);
});

// Exercices
(p?.exercices ?? []).forEach((e, i) => {
  const ou = `exercices[${i}]`;
  cles(e, CLES.exercice, ou);
  verifierCommun(e, ou);
  if (!EXO_TYPES.includes(e.type)) err(`${ou} : type invalide « ${e.type} »`);
  for (const k of ['titre', 'enonce', 'correction']) if (!chaine(e[k])) err(`${ou} : ${k} vide`);
  if (![1, 2, 3].includes(e.difficulte)) err(`${ou} : difficulte doit valoir 1, 2 ou 3`);
  if (e.type === 'parsons' && (!Array.isArray(e.lignes) || e.lignes.length < 2)) err(`${ou} : parsons demande au moins 2 lignes`);
  if (e.type !== 'parsons' && ('lignes' in e || 'distracteurs' in e)) err(`${ou} : lignes et distracteurs réservés au type parsons`);
});

// Points à vérifier
(p?.pointsAVerifier ?? []).forEach((v, i) => {
  if (!chaine(v?.texte)) err(`pointsAVerifier[${i}] : texte vide`);
});

// Avertissements de qualité
const nbCartes = (p?.cartes ?? []).length;
if (nbCartes > 0 && nbVrai + nbFaux > 4) {
  const part = nbVrai / (nbVrai + nbFaux);
  if (part > 0.65 || part < 0.35) warn(`vrai/faux déséquilibré : ${nbVrai} vrais pour ${nbFaux} faux (viser 40 à 60 % de vrais, sinon la réponse se devine)`);
}
if (nbCartes === 0 && (p?.qcm ?? []).length === 0 && (p?.exercices ?? []).length === 0) warn('paquet sans carte, sans QCM et sans exercice');
const aVerifier = [...(p?.cartes ?? []), ...(p?.qcm ?? []), ...(p?.exercices ?? [])].filter((x) => x?.aVerifier).length;

for (const m of avertissements) console.warn(`avertissement : ${m}`);
for (const m of erreurs) console.error(`erreur : ${m}`);
console.log(
  `${erreurs.length === 0 ? 'OK' : 'ÉCHEC'} : ${nbCartes} cartes (${nbVrai} vrai, ${nbFaux} faux), ` +
    `${(p?.qcm ?? []).length} QCM, ${(p?.exercices ?? []).length} exercices, ${aVerifier} éléments à vérifier, ` +
    `${(p?.pointsAVerifier ?? []).length} points à vérifier avec l'enseignant`
);
process.exit(erreurs.length === 0 ? 0 : 1);
