import { Routes } from '@angular/router';
import { TriviaComponent } from './components/trivia/trivia';
import { LeaderboardComponent } from './components/leaderboard/leaderboard';

export const routes: Routes = [
  { path: '', component: TriviaComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: '**', redirectTo: '' },
];
