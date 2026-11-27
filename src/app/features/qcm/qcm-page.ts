import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ModeQcm,
  QuestionAffichee,
  ResultatQcm,
  construireSerie,
  dureeExamenSecondes,
  estJuste,
  formaterDuree,
} from '../../core/engine/qcm';
import { Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ProgressionService } from '../../core/services/progression.service';
import { rendreMarkdownEnLigne } from '../../core/util/markdown';

type Phase = 'chargement' | 'preparation' | 'question' | 'bilan';

interface Copie {
  question: QuestionAffichee;
  selection: Set<number>;
  /** null : pas de réponse (temps écoulé). */
  juste: boolean | null;
}

@Component({
  selector: 'app-qcm-page',
  imports: [RouterLink],
  template: `
    @if (erreur()) {
      <p class="carte text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else {
      @switch (phase()) {
        @case ('chargement') {
          <p class="text-gray-500">Chargement…</p>
        }

        @case ('preparation') {
          <a [routerLink]="['/cours', coursId]" class="text-sm text-indigo-700 hover:underline dark:text-indigo-300">← Retour au cours</a>
          <h1 class="mb-4 mt-3 text-2xl font-bold">QCM</h1>
          <section class="carte space-y-4">
            <fieldset>
              <legend class="mb-2 font-semibold">Mode</legend>
              <div class="grid grid-cols-2 gap-3">
                <button type="button" class="btn" [class]="mode() === 'entrainement' ? 'btn-primaire' : 'btn-secondaire'" [attr.aria-pressed]="mode() === 'entrainement'" (click)="mode.set('entrainement')">Entraînement</button>
                <button type="button" class="btn" [class]="mode() === 'examen' ? 'btn-primaire' : 'btn-secondaire'" [attr.aria-pressed]="mode() === 'examen'" (click)="mode.set('examen')">Examen chronométré</button>
              </div>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ mode() === 'entrainement' ? 'Correction après chaque question.' : 'Correction à la fin. 1 minute par question, 2 pour les difficiles.' }}
              </p>
            </fieldset>

            <fieldset>
              <legend class="mb-2 font-semibold">Nombre de questions</legend>
              <div class="flex flex-wrap gap-2">
                @for (n of choixNombre(); track n) {
                  <button type="button" class="btn" [class]="nombre() === n ? 'btn-primaire' : 'btn-secondaire'" [attr.aria-pressed]="nombre() === n" (click)="nombre.set(n)">
                    {{ n === 0 ? 'Toutes (' + paquet()!.qcm.length + ')' : n }}
                  </button>
                }
              </div>
            </fieldset>

            @if (nbErreurs() > 0) {
              <label class="flex items-center gap-2">
                <input type="checkbox" class="size-5" [checked]="erreursSeulement()" (change)="erreursSeulement.set(!erreursSeulement())" />
                <span>Seulement mes erreurs ({{ nbErreurs() }})</span>
              </label>
            }

            <button type="button" class="btn btn-primaire w-full" [disabled]="paquet()!.qcm.length === 0" (click)="demarrer()">Commencer</button>
          </section>
        }

        @case ('question') {
          @if (question(); as q) {
            <div class="mb-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <button type="button" class="hover:underline" (click)="abandonner()">← Abandonner</button>
              <span aria-live="polite">{{ position() + 1 }} / {{ serie().length }}</span>
              @if (mode() === 'examen') {
                <span class="font-mono font-semibold" [class.text-red-700]="restant() <= 30" role="timer">{{ dureeRestante() }}</span>
              }
            </div>
            <div class="mb-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" role="progressbar" aria-valuemin="0" [attr.aria-valuemax]="serie().length" [attr.aria-valuenow]="position()">
              <div class="h-full bg-indigo-600 transition-all" [style.width.%]="(100 * position()) / serie().length"></div>
            </div>

            <section class="carte">
              <p class="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                Difficulté {{ q.qcm.difficulte }}/3 @if (q.multiple) { · plusieurs réponses possibles }
              </p>
              <p class="mb-4 text-lg font-medium" [innerHTML]="md(q.qcm.enonce)"></p>

              <div class="space-y-2">
                @for (o of q.options; track o.indexOrigine; let i = $index) {
                  <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-3" [class]="classeOption(i)">
                    <input
                      [type]="q.multiple ? 'checkbox' : 'radio'"
                      name="reponse"
                      class="mt-1 size-5 shrink-0"
                      [checked]="selection().has(i)"
                      [disabled]="corrige()"
                      (change)="basculer(i)"
                    />
                    <span class="min-w-0">
                      <span [innerHTML]="md(o.texte)"></span>
                      @if (corrige()) {
                        <span class="mt-1 block text-sm text-gray-700 dark:text-gray-300" [innerHTML]="md(o.explication)"></span>
                      }
                    </span>
                  </label>
                }
              </div>

              @if (corrige()) {
                <p class="mt-3 rounded-xl p-3 font-semibold" [class]="dernierJuste() ? 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200'" role="status">
                  {{ dernierJuste() ? 'Bonne réponse' : 'Mauvaise réponse' }}
                </p>
                <p class="mt-2 text-xs text-gray-500">Source : {{ q.qcm.source.fichier }}@if (q.qcm.source.lieu) {, {{ q.qcm.source.lieu }}}</p>
                @if (q.qcm.aVerifier) {
                  <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">⚠ Point à vérifier avec l'enseignant.</p>
                }
                <button type="button" class="btn btn-primaire mt-3 w-full" (click)="suivant()">
                  {{ position() + 1 >= serie().length ? 'Voir le bilan' : 'Suivant' }}
                </button>
              } @else {
                <button type="button" class="btn btn-primaire mt-4 w-full" [disabled]="selection().size === 0" (click)="valider()">
                  {{ mode() === 'examen' ? (position() + 1 >= serie().length ? 'Terminer' : 'Valider et continuer') : 'Valider' }}
                </button>
              }
            </section>
          }
        }

        @case ('bilan') {
          <section class="carte mb-4 text-center">
            <h1 class="mb-2 text-2xl font-bold">Bilan</h1>
            <p class="text-3xl font-bold">{{ nbJustes() }} / {{ copies().length }}</p>
            <p class="mb-1 text-gray-600 dark:text-gray-400">{{ pourcentage() }} %@if (tempsEcoule()) { · temps écoulé } </p>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <button type="button" class="btn btn-secondaire" (click)="recommencer()">Nouvelle série</button>
              <a [routerLink]="['/cours', coursId]" class="btn btn-primaire">Retour au cours</a>
            </div>
          </section>

          <h2 class="mb-2 font-semibold">Détail</h2>
          <ul class="space-y-3">
            @for (c of copies(); track c.question.qcm.id; let n = $index) {
              <li class="carte">
                <p class="mb-2 font-medium">
                  <span [class]="c.juste ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">{{ c.juste ? '✓' : '✗' }}</span>
                  {{ n + 1 }}. <span [innerHTML]="md(c.question.qcm.enonce)"></span>
                </p>
                <ul class="space-y-1 text-sm">
                  @for (o of c.question.options; track o.indexOrigine; let i = $index) {
                    <li [class]="o.correcte ? 'text-green-800 dark:text-green-300' : c.selection.has(i) ? 'text-red-800 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'">
                      {{ o.correcte ? '✓' : c.selection.has(i) ? '✗' : '·' }} <span [innerHTML]="md(o.texte)"></span>
                      <span class="block pl-4 text-gray-600 dark:text-gray-400" [innerHTML]="md(o.explication)"></span>
                    </li>
                  }
                </ul>
                @if (c.juste === null) {
                  <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">Sans réponse (temps écoulé).</p>
                }
              </li>
            }
          </ul>
        }
      }
    }
  `,
})
export class QcmPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(CatalogueService);
  private readonly progression = inject(ProgressionService);
  private minuteur?: ReturnType<typeof setInterval>;

  protected readonly coursId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly md = rendreMarkdownEnLigne;

  protected readonly phase = signal<Phase>('chargement');
  protected readonly erreur = signal('');
  protected readonly paquet = signal<Paquet | null>(null);
  private readonly resultats = signal<Map<string, ResultatQcm>>(new Map());

  protected readonly mode = signal<ModeQcm>('entrainement');
  protected readonly nombre = signal(0);
  protected readonly erreursSeulement = signal(false);

  protected readonly serie = signal<QuestionAffichee[]>([]);
  protected readonly position = signal(0);
  protected readonly selection = signal<ReadonlySet<number>>(new Set());
  protected readonly corrige = signal(false);
  protected readonly dernierJuste = signal(false);
  protected readonly copies = signal<Copie[]>([]);
  protected readonly restant = signal(0);
  protected readonly tempsEcoule = signal(false);

  protected readonly question = computed(() => this.serie()[this.position()] ?? null);
  protected readonly nbErreurs = computed(() => [...this.resultats().values()].filter((r) => !r.juste).length);
  protected readonly nbJustes = computed(() => this.copies().filter((c) => c.juste).length);
  protected readonly pourcentage = computed(() =>
    this.copies().length === 0 ? 0 : Math.round((100 * this.nbJustes()) / this.copies().length),
  );
  protected readonly dureeRestante = computed(() => formaterDuree(this.restant()));
  protected readonly choixNombre = computed(() => {
    const total = this.paquet()?.qcm.length ?? 0;
    return [...[5, 10, 20].filter((n) => n < total), 0];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.arreterMinuteur());
  }

  async ngOnInit(): Promise<void> {
    try {
      const p = await this.catalogue.paquet(this.coursId);
      this.paquet.set(p);
      this.resultats.set(await this.progression.resultatsQcm(p.id));
      this.phase.set('preparation');
    } catch {
      this.erreur.set("Ce cours est introuvable ou n'a pas pu être chargé.");
    }
  }

  protected demarrer(): void {
    const p = this.paquet();
    if (!p) return;
    const serie = construireSerie(p.qcm, this.resultats(), {
      nombre: this.nombre() === 0 ? undefined : this.nombre(),
      erreursSeulement: this.erreursSeulement(),
    });
    if (serie.length === 0) return;
    this.serie.set(serie);
    this.position.set(0);
    this.copies.set([]);
    this.tempsEcoule.set(false);
    this.reinitialiserQuestion();
    this.phase.set('question');
    if (this.mode() === 'examen') this.lancerMinuteur(dureeExamenSecondes(serie));
  }

  protected basculer(index: number): void {
    if (this.corrige()) return;
    const q = this.question();
    if (!q) return;
    const s = new Set(q.multiple ? this.selection() : []);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    this.selection.set(s);
  }

  protected async valider(): Promise<void> {
    const q = this.question();
    if (!q || this.corrige() || this.selection().size === 0) return;
    const juste = estJuste(q, this.selection());
    this.copies.update((c) => [...c, { question: q, selection: new Set(this.selection()), juste }]);
    this.resultats.update((m) => new Map(m).set(q.qcm.id, { juste, date: new Date().toISOString() }));
    await this.progression.noterQcm(this.coursId, q.qcm.id, juste);
    if (this.mode() === 'entrainement') {
      this.dernierJuste.set(juste);
      this.corrige.set(true);
    } else {
      this.suivant();
    }
  }

  protected suivant(): void {
    if (this.position() + 1 >= this.serie().length) {
      this.terminer();
      return;
    }
    this.position.update((p) => p + 1);
    this.reinitialiserQuestion();
  }

  protected abandonner(): void {
    if (this.copies().length > 0 && !confirm('Abandonner la série ? Tes réponses déjà validées restent enregistrées.')) return;
    this.arreterMinuteur();
    this.phase.set('preparation');
  }

  protected recommencer(): void {
    this.phase.set('preparation');
  }

  protected classeOption(i: number): string {
    const q = this.question();
    if (!q) return '';
    const choisie = this.selection().has(i);
    if (this.corrige()) {
      if (q.options[i].correcte) return 'border-green-600 bg-green-50 dark:bg-green-900/30';
      if (choisie) return 'border-red-600 bg-red-50 dark:bg-red-900/30';
      return 'border-gray-200 dark:border-gray-800';
    }
    return choisie
      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
      : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900';
  }

  private reinitialiserQuestion(): void {
    this.selection.set(new Set());
    this.corrige.set(false);
  }

  private terminer(): void {
    this.arreterMinuteur();
    // Questions non traitées (temps écoulé) : comptées fausses, sans réponse
    const traitees = new Set(this.copies().map((c) => c.question.qcm.id));
    const manquantes = this.serie().filter((q) => !traitees.has(q.qcm.id));
    if (manquantes.length > 0) {
      this.copies.update((c) => [...c, ...manquantes.map((question) => ({ question, selection: new Set<number>(), juste: null }))]);
    }
    this.phase.set('bilan');
  }

  private lancerMinuteur(secondes: number): void {
    this.arreterMinuteur();
    const fin = Date.now() + secondes * 1000;
    this.restant.set(secondes);
    this.minuteur = setInterval(() => {
      const reste = Math.ceil((fin - Date.now()) / 1000);
      this.restant.set(Math.max(0, reste));
      if (reste <= 0) {
        this.tempsEcoule.set(true);
        this.terminer();
      }
    }, 500);
  }

  private arreterMinuteur(): void {
    if (this.minuteur !== undefined) clearInterval(this.minuteur);
    this.minuteur = undefined;
  }
}
