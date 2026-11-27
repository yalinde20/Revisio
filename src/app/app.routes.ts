import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/catalogue/catalogue-page').then((m) => m.CataloguePage),
    title: 'Revisio',
  },
  {
    path: 'cours/:id',
    loadComponent: () => import('./features/cours/cours-page').then((m) => m.CoursPage),
    title: 'Cours | Revisio',
  },
  {
    path: 'cours/:id/cartes',
    loadComponent: () => import('./features/cartes/seance-cartes-page').then((m) => m.SeanceCartesPage),
    title: 'Cartes | Revisio',
  },
  { path: '**', redirectTo: '' },
];
