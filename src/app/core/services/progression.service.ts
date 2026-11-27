import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { Card } from 'ts-fsrs';
import { CarteFsrsJson, deserialiser, planifier, serialiser } from '../engine/planification';
import { ResultatQcm } from '../engine/qcm';

interface LigneCarte {
  /** `${coursId}/${carteId}` */
  cle: string;
  coursId: string;
  carteId: string;
  carte: CarteFsrsJson;
}

const NOM_BASE = 'revisio';

/** Dernier résultat d'une question de QCM ou d'un exercice. */
interface LigneResultat {
  /** `${coursId}/${elementId}` */
  cle: string;
  coursId: string;
  elementId: string;
  juste: boolean;
  date: string;
}

export type StatutExercice = 'reussi' | 'a_revoir';

/**
 * Progression de l'élève, stockée dans IndexedDB sur l'appareil (fonctionne hors ligne).
 * La synchronisation entre appareils (Firestore) viendra par-dessus, sans changer ce contrat.
 */
@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private base?: Promise<IDBPDatabase>;

  private ouvrir(): Promise<IDBPDatabase> {
    this.base ??= openDB(NOM_BASE, 2, {
      upgrade(db, ancienneVersion) {
        if (ancienneVersion < 1) {
          db.createObjectStore('cartes', { keyPath: 'cle' }).createIndex('coursId', 'coursId');
        }
        if (ancienneVersion < 2) {
          db.createObjectStore('qcm', { keyPath: 'cle' }).createIndex('coursId', 'coursId');
          db.createObjectStore('exercices', { keyPath: 'cle' }).createIndex('coursId', 'coursId');
        }
      },
    });
    return this.base;
  }

  /** États FSRS de toutes les cartes déjà vues d'un cours, par identifiant de carte. */
  async etats(coursId: string): Promise<Map<string, Card>> {
    const db = await this.ouvrir();
    const lignes: LigneCarte[] = await db.getAllFromIndex('cartes', 'coursId', coursId);
    return new Map(lignes.map((l) => [l.carteId, deserialiser(l.carte)]));
  }

  /** Enregistre une réponse (juste ou fausse) et renvoie le nouvel état FSRS de la carte. */
  async noter(coursId: string, carteId: string, juste: boolean, maintenant = new Date()): Promise<Card> {
    const db = await this.ouvrir();
    const cle = `${coursId}/${carteId}`;
    const existante: LigneCarte | undefined = await db.get('cartes', cle);
    const nouvelle = planifier(existante ? deserialiser(existante.carte) : undefined, juste, maintenant);
    const ligne: LigneCarte = { cle, coursId, carteId, carte: serialiser(nouvelle) };
    await db.put('cartes', ligne);
    return nouvelle;
  }

  /** Dernier résultat de chaque question de QCM d'un cours. */
  async resultatsQcm(coursId: string): Promise<Map<string, ResultatQcm>> {
    return this.resultats('qcm', coursId);
  }

  async noterQcm(coursId: string, qcmId: string, juste: boolean, maintenant = new Date()): Promise<void> {
    await this.ecrireResultat('qcm', coursId, qcmId, juste, maintenant);
  }

  /** Statut de chaque exercice déjà auto-évalué. */
  async statutsExercices(coursId: string): Promise<Map<string, StatutExercice>> {
    const r = await this.resultats('exercices', coursId);
    return new Map([...r].map(([id, v]) => [id, v.juste ? 'reussi' : 'a_revoir'] as const));
  }

  async noterExercice(coursId: string, exerciceId: string, reussi: boolean, maintenant = new Date()): Promise<void> {
    await this.ecrireResultat('exercices', coursId, exerciceId, reussi, maintenant);
  }

  async reinitialiser(coursId: string): Promise<void> {
    const db = await this.ouvrir();
    for (const nom of ['cartes', 'qcm', 'exercices'] as const) {
      const cles = await db.getAllKeysFromIndex(nom, 'coursId', coursId);
      const tx = db.transaction(nom, 'readwrite');
      await Promise.all([...cles.map((k) => tx.store.delete(k)), tx.done]);
    }
  }

  private async resultats(store: 'qcm' | 'exercices', coursId: string): Promise<Map<string, ResultatQcm>> {
    const db = await this.ouvrir();
    const lignes: LigneResultat[] = await db.getAllFromIndex(store, 'coursId', coursId);
    return new Map(lignes.map((l) => [l.elementId, { juste: l.juste, date: l.date }]));
  }

  private async ecrireResultat(
    store: 'qcm' | 'exercices',
    coursId: string,
    elementId: string,
    juste: boolean,
    maintenant: Date,
  ): Promise<void> {
    const db = await this.ouvrir();
    const ligne: LigneResultat = { cle: `${coursId}/${elementId}`, coursId, elementId, juste, date: maintenant.toISOString() };
    await db.put(store, ligne);
  }
}
