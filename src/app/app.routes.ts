import { Routes } from '@angular/router';
import { TriviaComponent } from './components/trivia/trivia';

import { HomeComponent } from './components/home/home';

import { AdminComponent } from './components/admin/admin';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trivia', component: TriviaComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' },
];
