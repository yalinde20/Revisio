import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntreeCatalogue } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService } from '../../core/services/progression.service';

interface LigneCours {
  cours: EntreeCatalogue;
  nouvelles: number;
  aRevoir: number;
}

@Component({
  selector: 'app-catalogue-page',
  imports: [RouterLink],
  template: `
    <h1 class="mb-1 text-2xl font-bold">Mes cours</h1>
    <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">Choisis un cours pour réviser.</p>

    @if (erreur()) {
      <p class="carte text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else if (lignes() === null) {
      <p class="text-gray-500">Chargement…</p>
    } @else if (lignes()!.length === 0) {
      <p class="carte">Aucun cours pour l'instant.</p>
    } @else {
      <ul class="space-y-3">
        @for (l of lignes(); track l.cours.id) {
          <li>
            <a [routerLink]="['/cours', l.cours.id]" class="carte block transition hover:border-indigo-400">
              <p class="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                {{ l.cours.matiere }}
              </p>
              <h2 class="text-lg font-semibold">{{ l.cours.titre }}</h2>
              <p class="mt-2 flex flex-wrap gap-2 text-sm">
                @if (l.aRevoir > 0) {
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                    >{{ l.aRevoir }} à revoir</span
                  >
                }
                @if (l.nouvelles > 0) {
                  <span class="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200"
                    >{{ l.nouvelles }} nouvelles</span
                  >
                }
                @if (l.aRevoir === 0 && l.nouvelles === 0) {
                  <span class="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-900 dark:bg-green-900/40 dark:text-green-200"
                    >À jour</span
                  >
                }
              </p>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class CataloguePage implements OnInit {
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);

  protected readonly lignes = signal<LigneCours[] | null>(null);
  protected readonly erreur = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const cours = await this.catalogue.catalogue();
      const maintenant = Date.now();
      const lignes: LigneCours[] = [];
      for (const c of cours) {
        const etats = await this.progression.etats(c.id);
        const aRevoir = [...etats.values()].filter((e) => e.due.getTime() <= maintenant).length;
        lignes.push({ cours: c, aRevoir, nouvelles: Math.max(0, c.nbCartes - etats.size) });
      }
      this.lignes.set(lignes);
    } catch {
      this.erreur.set('Impossible de charger les cours. Vérifie ta connexion et recharge la page.');
    }
  }
}
