import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { compter, CompteurCours } from '../../core/engine/seance';
import { Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService } from '../../core/services/progression.service';

@Component({
  selector: 'app-cours-page',
  imports: [RouterLink],
  template: `
    <a routerLink="/" class="text-sm text-indigo-700 hover:underline dark:text-indigo-300">← Mes cours</a>

    @if (erreur()) {
      <p class="carte mt-4 text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else if (paquet(); as p) {
      <p class="mt-3 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{{ p.matiere }}</p>
      <h1 class="mb-4 text-2xl font-bold">{{ p.titre }}</h1>

      <section class="carte mb-4">
        <h2 class="mb-2 font-semibold">Cartes ({{ p.cartes.length }})</h2>
        @if (compteur(); as c) {
          <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
            {{ c.aRevoir }} à revoir, {{ c.nouvelles }} nouvelles, {{ c.enAttente }} en attente.
          </p>
          <a
            [routerLink]="['/cours', p.id, 'cartes']"
            class="btn btn-primaire w-full"
            [class.pointer-events-none]="c.aRevoir + c.nouvelles === 0"
            [class.opacity-50]="c.aRevoir + c.nouvelles === 0"
            [attr.aria-disabled]="c.aRevoir + c.nouvelles === 0 ? 'true' : null"
          >
            {{ c.aRevoir + c.nouvelles === 0 ? 'Rien à réviser pour le moment' : 'Réviser les cartes' }}
          </a>
        }
      </section>

      <section class="carte mb-4">
        <h2 class="mb-2 font-semibold">Bientôt</h2>
        <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>QCM chronométrés ({{ p.qcm.length }} questions)</li>
          <li>Exercices avec correction ({{ p.exercices.length }})</li>
          <li>Fiche de synthèse et carte mentale</li>
        </ul>
      </section>

      @if (p.pointsAVerifier.length > 0) {
        <section class="carte mb-4">
          <h2 class="mb-2 font-semibold">À vérifier avec l'enseignant</h2>
          <ul class="list-disc space-y-1 pl-5 text-sm">
            @for (v of p.pointsAVerifier; track v.texte) {
              <li>{{ v.texte }}</li>
            }
          </ul>
        </section>
      }

      <button type="button" class="text-sm text-gray-500 underline hover:text-red-700" (click)="reinitialiser(p)">
        Effacer ma progression sur ce cours
      </button>
    } @else {
      <p class="mt-4 text-gray-500">Chargement…</p>
    }
  `,
})
export class CoursPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);

  protected readonly paquet = signal<Paquet | null>(null);
  protected readonly compteur = signal<CompteurCours | null>(null);
  protected readonly erreur = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const p = await this.catalogue.paquet(this.route.snapshot.paramMap.get('id') ?? '');
      this.paquet.set(p);
      await this.recharger(p);
    } catch {
      this.erreur.set("Ce cours est introuvable ou n'a pas pu être chargé.");
    }
  }

  private async recharger(p: Paquet): Promise<void> {
    this.compteur.set(compter(p.cartes, await this.progression.etats(p.id), new Date()));
  }

  protected async reinitialiser(p: Paquet): Promise<void> {
    if (!confirm('Effacer toute ta progression sur ce cours ? Cette action est définitive.')) return;
    await this.progression.reinitialiser(p.id);
    await this.recharger(p);
  }
}
