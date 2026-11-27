import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_VERSION } from './core/version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header class="flex items-center justify-between py-4">
        <a routerLink="/" class="text-xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">Revisio</a>
        <span class="text-xs text-gray-500 dark:text-gray-400">v{{ version }}</span>
      </header>
      <main class="flex-1 pb-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  protected readonly version = APP_VERSION;
}
