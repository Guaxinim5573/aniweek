import { Routes } from '@angular/router';
import { IndexPage } from './pages/index.page/index.page';
import { AuthorizationPage } from './pages/authorization.page/authorization.page';

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    component: IndexPage
  },
  { path: "anilist/callback", component: AuthorizationPage }
];


// https://aniweek.guaxinim.online/anilist/callback#access_token=eySUPER_LONG_TOKENwei&token_type=Bearer&expires_in=31536000