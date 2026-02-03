import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIcons } from "@ng-icons/core"

import { routes } from './app.routes';
import { heroClock, heroShare } from "@ng-icons/heroicons/outline"
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes),
    provideIcons({
      heroClock,
      heroShare
    })
  ]
};
