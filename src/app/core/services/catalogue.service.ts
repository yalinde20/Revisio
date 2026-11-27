import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntreeCatalogue, Paquet } from '../models/paquet';

/**
 * Accès au contenu des cours. Pour l'instant : fichiers JSON servis avec l'app
 * (`public/content/`, produits par `npm run indexer`). Le contenu des enseignants
 * ne doit pas être déployé tel quel : avant la mise en ligne, cette classe lira
 * Firestore, réservé aux comptes autorisés.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<Paquet>>();

  catalogue(): Promise<EntreeCatalogue[]> {
    return firstValueFrom(this.http.get<EntreeCatalogue[]>('content/index.json'));
  }

  paquet(id: string): Promise<Paquet> {
    // L'identifiant vient de l'URL : on le contraint avant de construire un chemin
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return Promise.reject(new Error('Identifiant de cours invalide'));
    let p = this.cache.get(id);
    if (!p) {
      p = firstValueFrom(this.http.get<Paquet>(`content/${id}.json`));
      p.catch(() => this.cache.delete(id));
      this.cache.set(id, p);
    }
    return p;
  }
}
