import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService, StatutExercice } from '../../core/services/progression.service';
import { LIBELLES_TYPE_EXERCICE } from './libelles';

@Component({
  selector: 'app-exercices-page',
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/cours', coursId]" class="text-sm text-indigo-700 hover:underline dark:text-indigo-300">← Retour au cours</a>
    <h1 class="mb-4 mt-3 text-2xl font-bold">Exercices</h1>

    @if (erreur()) {
      <p class="carte text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else if (paquet(); as p) {
      @if (p.exercices.length === 0) {
        <p class="carte">Aucun exercice dans ce cours.</p>
      } @else {
        <ul class="space-y-3">
          @for (e of p.exercices; track e.id) {
            <li>
              <a [routerLink]="['/cours', p.id, 'exercices', e.id]" class="carte flex items-center justify-between gap-3 transition hover:border-indigo-400">
                <span class="min-w-0">
                  <span class="block text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                    {{ libelles[e.type] }} · difficulté {{ e.difficulte }}/3
                  </span>
                  <span class="block font-semibold">{{ e.titre }}</span>
                </span>
                @switch (statuts().get(e.id)) {
                  @case ('reussi') {
                    <span class="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-900 dark:bg-green-900/40 dark:text-green-200">Réussi</span>
                  }
                  @case ('a_revoir') {
                    <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">À revoir</span>
                  }
                }
              </a>
            </li>
          }
        </ul>
      }
    } @else {
      <p class="text-gray-500">Chargement…</p>
    }
  `,
})
export class ExercicesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);

  protected readonly coursId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly libelles = LIBELLES_TYPE_EXERCICE;
  protected readonly paquet = signal<Paquet | null>(null);
  protected readonly statuts = signal<Map<string, StatutExercice>>(new Map());
  protected readonly erreur = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const p = await this.catalogue.paquet(this.coursId);
      this.paquet.set(p);
      this.statuts.set(await this.progression.statutsExercices(p.id));
    } catch {
      this.erreur.set("Ce cours est introuvable ou n'a pas pu être chargé.");
    }
  }
}
