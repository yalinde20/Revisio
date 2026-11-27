# Revisio

Révise tes cours avec des flashcards (vrai/faux et réponse courte) à répétition espacée FSRS, des QCM chronométrés, des exercices corrigés, des fiches et des cartes mentales.

Le contenu n'est pas écrit à la main : il est généré à partir des cours (PDF, docx, notes) par la commande `/reviser` du Jarvis de Yoan, qui produit un **paquet de cours** JSON (format dans `schema/paquet.schema.json`). L'app ne fait que lire ces paquets : aucun appel à une API d'IA, aucune clé.

## Lancer en local

```bash
npm install
npm start            # http://localhost:4200
npm run test:ci      # tests unitaires (Chrome sans interface)
```

## Ajouter un cours

1. Générer le paquet avec `/reviser` (dans le Jarvis), puis le copier dans `public/content/<id>.json`.
2. `npm run valider -- public/content/<id>.json` : contrôle le paquet.
3. `npm run indexer` : met à jour `public/content/index.json` (catalogue).

`public/content/` n'est **pas versionné** : le contenu dérive des cours des enseignants et ne doit pas être déployé tel quel. Avant la mise en ligne, le contenu passera par Firestore, lisible uniquement par les comptes autorisés (`firestore.rules`).

## État

- Fait : catalogue, page de cours, flashcards (vrai/faux, réponse courte tolérante aux accents, à la casse et aux fautes de frappe) avec répétition espacée FSRS, QCM (entraînement avec correction immédiate ou examen chronométré, choix multiples, reprise de ses erreurs), exercices (auto-évaluation, indices, Parsons en touchant les lignes), fiche de synthèse et carte mentale (markmap). Progression hors ligne dans IndexedDB.
- À faire : comptes Firebase et liste blanche, synchronisation de la progression, publication vers Firestore, export Anki.
- Le projet Firebase n'existe pas encore (à créer dans la console, puis `firebase deploy --only firestore:rules`). Les règles sont écrites mais pas testées sur l'émulateur.

## Commits

Commits conventionnels (`feat:`, `fix:`, ...) : release-please s'en sert pour les versions.
