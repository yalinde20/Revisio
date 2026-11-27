import { Component, ElementRef, OnDestroy, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Paquet } from '../../core/models/paquet';
import { CatalogueService } from '../../core/services/catalogue.service';
import { rendreMarkdown } from '../../core/util/markdown';

type Onglet = 'fiche' | 'carte';

@Component({
  selector: 'app-fiche-page',
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/cours', coursId]" class="text-sm text-indigo-700 hover:underline dark:text-indigo-300">← Retour au cours</a>

    @if (erreur()) {
      <p class="carte mt-4 text-red-700 dark:text-red-300" role="alert">{{ erreur() }}</p>
    } @else if (paquet(); as p) {
      <h1 class="mb-3 mt-3 text-2xl font-bold">{{ p.titre }}</h1>

      <div class="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Fiche ou carte mentale">
        <button type="button" role="tab" class="btn" [class]="onglet() === 'fiche' ? 'btn-primaire' : 'btn-secondaire'" [attr.aria-selected]="onglet() === 'fiche'" (click)="onglet.set('fiche')">Fiche</button>
        <button type="button" role="tab" class="btn" [class]="onglet() === 'carte' ? 'btn-primaire' : 'btn-secondaire'" [attr.aria-selected]="onglet() === 'carte'" (click)="onglet.set('carte')">Carte mentale</button>
      </div>

      @if (onglet() === 'fiche') {
        <article class="carte markdown" role="tabpanel" [innerHTML]="html(p.fiche)"></article>
      } @else {
        <div class="carte bg-white p-0 dark:bg-white" role="tabpanel">
          <svg #carte class="block h-[70vh] w-full" aria-label="Carte mentale du cours"></svg>
        </div>
        <p class="mt-2 text-center text-xs text-gray-500">Glisse pour déplacer, pince ou molette pour zoomer, touche un nœud pour le replier.</p>
        @if (erreurCarte()) {
          <p class="carte mt-2 text-red-700 dark:text-red-300" role="alert">{{ erreurCarte() }}</p>
        }
      }
    } @else {
      <p class="mt-4 text-gray-500">Chargement…</p>
    }
  `,
})
export class FichePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(CatalogueService);

  protected readonly coursId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly html = rendreMarkdown;
  protected readonly paquet = signal<Paquet | null>(null);
  protected readonly erreur = signal('');
  protected readonly erreurCarte = signal('');
  protected readonly onglet = signal<Onglet>('fiche');

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('carte');
  private carte?: { destroy: () => void };

  constructor() {
    // La carte mentale (bibliothèque lourde) n'est chargée qu'à l'ouverture de l'onglet
    effect(() => {
      const svg = this.svg()?.nativeElement;
      const p = this.paquet();
      if (svg && p) void this.dessiner(svg, p.carteMentale);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.paquet.set(await this.catalogue.paquet(this.coursId));
    } catch {
      this.erreur.set("Ce cours est introuvable ou n'a pas pu être chargé.");
    }
  }

  ngOnDestroy(): void {
    this.carte?.destroy();
  }

  private async dessiner(svg: SVGSVGElement, markdown: string): Promise<void> {
    try {
      const [{ Transformer }, { Markmap }] = await Promise.all([import('markmap-lib'), import('markmap-view')]);
      const { root } = new Transformer().transform(markdown);
      this.carte?.destroy();
      svg.replaceChildren();
      this.carte = Markmap.create(svg, { duration: 250, maxWidth: 260, initialExpandLevel: 3 }, root);
    } catch {
      this.erreurCarte.set("La carte mentale n'a pas pu s'afficher.");
    }
  }
}
