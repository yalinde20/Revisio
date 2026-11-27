import { Component, ElementRef, HostListener, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { construireSeance } from '../../core/engine/seance';
import { ResultatVerification, verifierReponse } from '../../core/engine/verification';
import { Carte, Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService } from '../../core/services/progression.service';
import { rendreMarkdownEnLigne } from '../../core/util/markdown';

type Phase = 'chargement' | 'question' | 'correction' | 'fin' | 'vide';

@Component({
  selector: 'app-seance-cartes-page',
  imports: [FormsModule, RouterLink],
  template: `
    @if (erreur()) {
      <p class="carte text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else {
      @switch (phase()) {
        @case ('chargement') {
          <p class="text-gray-500">Chargement…</p>
        }
        @case ('vide') {
          <div class="carte text-center">
            <p class="mb-3 font-semibold">Rien à réviser pour le moment.</p>
            <a [routerLink]="['/cours', coursId]" class="btn btn-secondaire">Retour au cours</a>
          </div>
        }
        @case ('fin') {
          <div class="carte text-center">
            <h1 class="mb-2 text-2xl font-bold">Séance terminée</h1>
            <p class="mb-1 text-lg">{{ justes() }} bonnes réponses sur {{ total() }}</p>
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Les cartes ratées reviendront bientôt, les autres plus tard.
            </p>
            <a [routerLink]="['/cours', coursId]" class="btn btn-primaire w-full">Retour au cours</a>
          </div>
        }
        @default {
          @if (carte(); as c) {
            <div class="mb-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <a [routerLink]="['/cours', coursId]" class="hover:underline">← Quitter</a>
              <span aria-live="polite">{{ numero() }} / {{ file().length }}</span>
            </div>
            <div
              class="mb-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
              role="progressbar"
              [attr.aria-valuenow]="numero() - 1"
              aria-valuemin="0"
              [attr.aria-valuemax]="file().length"
            >
              <div class="h-full bg-indigo-600 transition-all" [style.width.%]="(100 * (numero() - 1)) / file().length"></div>
            </div>

            <section class="carte">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                {{ c.type === 'vrai_faux' ? 'Vrai ou faux ?' : 'Réponse courte' }}
              </p>
              <p class="mb-4 whitespace-pre-line text-lg font-medium" [innerHTML]="md(c.enonce)"></p>

              @if (phase() === 'question') {
                @if (c.type === 'vrai_faux') {
                  <div class="grid grid-cols-2 gap-3">
                    <button type="button" class="btn btn-secondaire" (click)="repondreVraiFaux(true)">Vrai</button>
                    <button type="button" class="btn btn-secondaire" (click)="repondreVraiFaux(false)">Faux</button>
                  </div>
                } @else {
                  <form (ngSubmit)="validerSaisie()" class="space-y-3">
                    <label class="sr-only" for="saisie">Ta réponse</label>
                    <input
                      #champ
                      id="saisie"
                      name="saisie"
                      [(ngModel)]="saisie"
                      autocomplete="off"
                      autocapitalize="off"
                      spellcheck="false"
                      class="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-950"
                      placeholder="Tape ta réponse"
                    />
                    <button type="submit" class="btn btn-primaire w-full">Valider</button>
                  </form>
                }
              } @else {
                <div
                  class="mb-3 rounded-xl p-3 font-semibold"
                  [class]="juste() ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200'"
                  role="status"
                >
                  @if (verification() === 'proche') {
                    Juste, à une faute de frappe près.
                  } @else {
                    {{ juste() ? 'Bonne réponse' : 'Mauvaise réponse' }}
                  }
                </div>
                <p class="mb-2">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Réponse attendue : </span>
                  <strong>{{ reponseAttendue() }}</strong>
                </p>
                <p class="mb-2 whitespace-pre-line" [innerHTML]="md(c.explication)"></p>
                <p class="mb-3 text-xs text-gray-500">Source : {{ c.source.fichier }}@if (c.source.lieu) {, {{ c.source.lieu }}}</p>
                @if (c.aVerifier) {
                  <p class="mb-3 text-xs text-amber-700 dark:text-amber-300">⚠ Point à vérifier avec l'enseignant.</p>
                }
                @if (c.type === 'reponse_courte' && !juste()) {
                  <button type="button" class="mb-3 text-sm text-indigo-700 underline dark:text-indigo-300" (click)="forcerJuste()">
                    Ma réponse était juste
                  </button>
                }
                <button type="button" class="btn btn-primaire w-full" (click)="suivant()">Suivant</button>
              }
            </section>
          }
        }
      }
    }
  `,
})
export class SeanceCartesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);

  protected readonly coursId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly md = rendreMarkdownEnLigne;
  protected readonly phase = signal<Phase>('chargement');
  protected readonly erreur = signal('');
  protected readonly file = signal<Carte[]>([]);
  protected readonly position = signal(0);
  protected readonly juste = signal(false);
  protected readonly verification = signal<ResultatVerification | null>(null);
  protected readonly justes = signal(0);
  protected readonly total = signal(0);
  protected saisie = '';

  private readonly champ = viewChild<ElementRef<HTMLInputElement>>('champ');
  /** Cartes déjà notées pendant cette séance : seule la première réponse compte pour FSRS. */
  private readonly dejaNotees = new Set<string>();

  protected readonly carte = computed(() => this.file()[this.position()] ?? null);
  protected readonly numero = computed(() => this.position() + 1);
  protected readonly reponseAttendue = computed(() => {
    const c = this.carte();
    if (!c) return '';
    return c.type === 'vrai_faux' ? (c.vrai ? 'Vrai' : 'Faux') : c.reponses[0];
  });

  constructor() {
    // Met le curseur dans le champ dès qu'une carte à réponse courte s'affiche
    effect(() => this.champ()?.nativeElement.focus());
  }

  async ngOnInit(): Promise<void> {
    try {
      const paquet: Paquet = await this.catalogue.paquet(this.coursId);
      const etats = await this.progression.etats(paquet.id);
      const seance = construireSeance(paquet.cartes, etats, new Date());
      this.file.set(seance);
      this.total.set(seance.length);
      this.phase.set(seance.length === 0 ? 'vide' : 'question');
    } catch {
      this.erreur.set("Ce cours est introuvable ou n'a pas pu être chargé.");
    }
  }

  protected repondreVraiFaux(choix: boolean): void {
    const c = this.carte();
    if (c?.type !== 'vrai_faux') return;
    this.verification.set(null);
    this.juste.set(choix === c.vrai);
    this.phase.set('correction');
  }

  protected validerSaisie(): void {
    const c = this.carte();
    if (c?.type !== 'reponse_courte' || this.saisie.trim() === '') return;
    const resultat = verifierReponse(this.saisie, c.reponses);
    this.verification.set(resultat);
    this.juste.set(resultat !== 'fausse');
    this.phase.set('correction');
  }

  protected forcerJuste(): void {
    this.juste.set(true);
  }

  protected async suivant(): Promise<void> {
    const c = this.carte();
    if (!c || this.phase() !== 'correction') return;
    const reussie = this.juste();
    if (!this.dejaNotees.has(c.id)) {
      this.dejaNotees.add(c.id);
      if (reussie) this.justes.update((n) => n + 1);
      await this.progression.noter(this.coursId, c.id, reussie);
      // Carte ratée : elle revient une fois à la fin de la séance, sans nouvelle note FSRS
      if (!reussie) this.file.update((f) => [...f, c]);
    }
    this.saisie = '';
    this.verification.set(null);
    if (this.position() + 1 >= this.file().length) {
      this.phase.set('fin');
    } else {
      this.position.update((p) => p + 1);
      this.phase.set('question');
    }
  }

  /** Entrée passe à la carte suivante, sauf quand on tape dans le champ de réponse. */
  @HostListener('document:keydown.enter', ['$event'])
  protected toucheEntree(e: Event): void {
    const cible = e.target as HTMLElement | null;
    if (this.phase() === 'correction' && cible?.tagName !== 'INPUT' && cible?.tagName !== 'BUTTON') {
      e.preventDefault();
      void this.suivant();
    }
  }
}
