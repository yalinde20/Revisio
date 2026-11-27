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
  {
    path: 'cours/:id/qcm',
    loadComponent: () => import('./features/qcm/qcm-page').then((m) => m.QcmPage),
    title: 'QCM | Revisio',
  },
  {
    path: 'cours/:id/exercices',
    loadComponent: () => import('./features/exercices/exercices-page').then((m) => m.ExercicesPage),
    title: 'Exercices | Revisio',
  },
  {
    path: 'cours/:id/exercices/:exoId',
    loadComponent: () => import('./features/exercices/exercice-page').then((m) => m.ExercicePage),
    title: 'Exercice | Revisio',
  },
  {
    path: 'cours/:id/fiche',
    loadComponent: () => import('./features/fiche/fiche-page').then((m) => m.FichePage),
    title: 'Fiche | Revisio',
  },
  { path: '**', redirectTo: '' },
];
