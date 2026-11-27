#!/usr/bin/env node
// Construit public/content/index.json à partir des paquets présents dans public/content/.
// Usage : npm run indexer
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dossier = 'public/content';
const entrees = [];
for (const nom of readdirSync(dossier).filter((f) => f.endsWith('.json') && f !== 'index.json').sort()) {
  const p = JSON.parse(readFileSync(join(dossier, nom), 'utf8'));
  if (`${p.id}.json` !== nom) {
    console.error(`${nom} : l'id « ${p.id} » ne correspond pas au nom du fichier (attendu ${p.id}.json)`);
    process.exit(1);
  }
  entrees.push({
    id: p.id,
    matiere: p.matiere,
    titre: p.titre,
    genereLe: p.genereLe,
    nbCartes: p.cartes.length,
    nbQcm: p.qcm.length,
    nbExercices: p.exercices.length,
  });
}
writeFileSync(join(dossier, 'index.json'), JSON.stringify(entrees, null, 2) + '\n');
console.log(`${entrees.length} cours indexés dans ${dossier}/index.json`);
