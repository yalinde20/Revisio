import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LigneParsons, preparerParsons, verifierParsons } from '../../core/engine/parsons';
import { Exercice, Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService } from '../../core/services/progression.service';
import { rendreMarkdown } from '../../core/util/markdown';
import { LIBELLES_TYPE_EXERCICE } from './libelles';

@Component({
  selector: 'app-exercice-page',
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/cours', coursId, 'exercices']" class="text-sm text-indigo-700 hover:underline dark:text-indigo-300">← Exercices</a>

    @if (erreur()) {
      <p class="carte mt-4 text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else if (exercice(); as e) {
      <p class="mt-3 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
        {{ libelles[e.type] }} · difficulté {{ e.difficulte }}/3
      </p>
      <h1 class="mb-4 text-2xl font-bold">{{ e.titre }}</h1>

      <section class="carte mb-4">
        <div class="markdown" [innerHTML]="html(e.enonce)"></div>
        @if (e.donnees) {
          <div class="markdown mt-3" [innerHTML]="html(e.donnees)"></div>
        }
        @if (e.aVerifier) {
          <p class="mt-3 text-xs text-amber-700 dark:text-amber-300">⚠ Point à vérifier avec l'enseignant.</p>
        }
      </section>

      @if (e.indices?.length) {
        <section class="mb-4">
          @for (indice of e.indices!.slice(0, indicesVus()); track $index) {
            <p class="carte mb-2 text-sm"><strong>Indice {{ $index + 1 }} :</strong> {{ indice }}</p>
          }
          @if (indicesVus() < e.indices!.length) {
            <button type="button" class="btn btn-secondaire" (click)="indicesVus.set(indicesVus() + 1)">
              Un indice ({{ indicesVus() }}/{{ e.indices!.length }})
            </button>
          }
        </section>
      }

      @if (e.type === 'parsons') {
        <section class="carte mb-4">
          <h2 class="mb-2 font-semibold">Ta solution</h2>
          <ol class="mb-3 min-h-12 space-y-1 rounded-xl border border-dashed border-gray-300 p-2 dark:border-gray-700">
            @for (l of choisies(); track l.id; let i = $index) {
              <li>
                <button
                  type="button"
                  class="w-full rounded-lg px-3 py-2 text-left font-mono text-sm"
                  [class]="classeLigne(i)"
                  [disabled]="verification() !== null"
                  (click)="retirer(l)"
                  [attr.aria-label]="'Retirer la ligne ' + (i + 1) + ' : ' + l.texte"
                >
                  {{ l.texte }}
                </button>
              </li>
            } @empty {
              <li class="px-1 text-sm text-gray-500">Touche les lignes ci-dessous dans le bon ordre.</li>
            }
          </ol>
          <h2 class="mb-2 font-semibold">Lignes disponibles</h2>
          <div class="mb-3 flex flex-col gap-1">
            @for (l of restantes(); track l.id) {
              <button type="button" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-left font-mono text-sm dark:border-gray-700 dark:bg-gray-900" [disabled]="verification() !== null" (click)="choisir(l)">
                {{ l.texte }}
              </button>
            }
          </div>
          @if (verification(); as v) {
            <p class="mb-3 rounded-xl p-3 font-semibold" [class]="v.reussi ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200'" role="status">
              {{ v.reussi ? 'Bon ordre !' : 'Pas tout à fait : les lignes en rouge sont mal placées ou en trop.' }}
            </p>
            @if (!v.reussi) {
              <button type="button" class="btn btn-secondaire w-full" (click)="recommencerParsons()">Réessayer</button>
            }
          } @else {
            <div class="grid grid-cols-2 gap-3">
              <button type="button" class="btn btn-secondaire" [disabled]="choisies().length === 0" (click)="vider()">Tout retirer</button>
              <button type="button" class="btn btn-primaire" [disabled]="choisies().length === 0" (click)="verifier()">Vérifier</button>
            </div>
          }
        </section>
      } @else {
        <section class="carte mb-4">
          <label class="mb-2 block font-semibold" for="reponse">Ta réponse</label>
          <textarea
            id="reponse"
            rows="6"
            class="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Écris ta réponse avant de regarder la correction, même si elle est fausse : c'est ce qui fait mémoriser."
            (input)="brouillon.set($any($event.target).value)"
          ></textarea>
        </section>
      }

      @if (!correctionVisible()) {
        <button
          type="button"
          class="btn btn-primaire w-full"
          [disabled]="e.type !== 'parsons' && brouillon().trim() === ''"
          (click)="correctionVisible.set(true)"
        >
          Voir la correction
        </button>
        @if (e.type !== 'parsons' && brouillon().trim() === '') {
          <p class="mt-2 text-center text-sm text-gray-500">Écris d'abord ta réponse.</p>
        }
      } @else {
        <section class="carte mb-4">
          <h2 class="mb-2 font-semibold">Correction</h2>
          @if (e.type === 'parsons' && e.lignes) {
            <ol class="mb-3 list-decimal space-y-1 pl-6 font-mono text-sm">
              @for (l of e.lignes; track $index) {
                <li>{{ l }}</li>
              }
            </ol>
          }
          <div class="markdown" [innerHTML]="html(e.correction)"></div>
          <p class="mt-3 text-xs text-gray-500">Source : {{ e.source.fichier }}@if (e.source.lieu) {, {{ e.source.lieu }}}</p>
        </section>

        <section class="carte">
          <h2 class="mb-2 font-semibold">Tu y es arrivé ?</h2>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" class="btn btn-secondaire" (click)="noter(false)">À revoir</button>
            <button type="button" class="btn btn-primaire" (click)="noter(true)">Réussi</button>
          </div>
        </section>
      }
    } @else {
      <p class="mt-4 text-gray-500">Chargement…</p>
    }
  `,
})
export class ExercicePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);

  protected readonly coursId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly libelles = LIBELLES_TYPE_EXERCICE;
  protected readonly html = rendreMarkdown;

  private paquet?: Paquet;
  protected readonly exercice = signal<Exercice | null>(null);
  protected readonly erreur = signal('');
  protected readonly indicesVus = signal(0);
  protected readonly brouillon = signal('');
  protected readonly correctionVisible = signal(false);

  protected readonly disponibles = signal<LigneParsons[]>([]);
  protected readonly choisies = signal<LigneParsons[]>([]);
  protected readonly verification = signal<{ positions: boolean[]; reussi: boolean } | null>(null);
  protected readonly restantes = computed(() => {
    const prises = new Set(this.choisies().map((l) => l.id));
    return this.disponibles().filter((l) => !prises.has(l.id));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.paquet = await this.catalogue.paquet(this.coursId);
      const e = this.paquet.exercices.find((x) => x.id === this.route.snapshot.paramMap.get('exoId'));
      if (!e) throw new Error('exercice introuvable');
      this.exercice.set(e);
      if (e.type === 'parsons' && e.lignes) this.disponibles.set(preparerParsons(e.lignes, e.distracteurs));
    } catch {
      this.erreur.set("Cet exercice est introuvable ou n'a pas pu être chargé.");
    }
  }

  protected choisir(l: LigneParsons): void {
    this.choisies.update((c) => [...c, l]);
  }

  protected retirer(l: LigneParsons): void {
    this.choisies.update((c) => c.filter((x) => x.id !== l.id));
  }

  protected vider(): void {
    this.choisies.set([]);
  }

  protected verifier(): void {
    const e = this.exercice();
    if (e?.type !== 'parsons' || !e.lignes) return;
    this.verification.set(verifierParsons(e.lignes, this.choisies()));
  }

  protected recommencerParsons(): void {
    this.verification.set(null);
    this.choisies.set([]);
  }

  protected classeLigne(i: number): string {
    const v = this.verification();
    if (!v) return 'bg-indigo-50 dark:bg-indigo-900/30';
    return v.positions[i] ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40';
  }

  protected async noter(reussi: boolean): Promise<void> {
    const e = this.exercice();
    if (!e) return;
    await this.progression.noterExercice(this.coursId, e.id, reussi);
    await this.router.navigate(['/cours', this.coursId, 'exercices']);
  }
}
