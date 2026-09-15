import { Routes } from '@angular/router';
import { TriviaComponent } from './components/trivia/trivia';
import { LeaderboardComponent } from './components/leaderboard/leaderboard';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trivia', component: TriviaComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: '**', redirectTo: '' },
];
