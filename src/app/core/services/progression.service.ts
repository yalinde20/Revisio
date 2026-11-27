import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { Card } from 'ts-fsrs';
import { CarteFsrsJson, deserialiser, planifier, serialiser } from '../engine/planification';

interface LigneCarte {
  /** `${coursId}/${carteId}` */
  cle: string;
  coursId: string;
  carteId: string;
  carte: CarteFsrsJson;
}

const NOM_BASE = 'revisio';

/**
 * Progression de l'élève, stockée dans IndexedDB sur l'appareil (fonctionne hors ligne).
 * La synchronisation entre appareils (Firestore) viendra par-dessus, sans changer ce contrat.
 */
@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private base?: Promise<IDBPDatabase>;

  private ouvrir(): Promise<IDBPDatabase> {
    this.base ??= openDB(NOM_BASE, 1, {
      upgrade(db) {
        const store = db.createObjectStore('cartes', { keyPath: 'cle' });
        store.createIndex('coursId', 'coursId');
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

  async reinitialiser(coursId: string): Promise<void> {
    const db = await this.ouvrir();
    const cles = await db.getAllKeysFromIndex('cartes', 'coursId', coursId);
    const tx = db.transaction('cartes', 'readwrite');
    await Promise.all([...cles.map((k) => tx.store.delete(k)), tx.done]);
  }
}
