import { Routes } from '@angular/router';
import { SamplerComponent } from './components/sampler/sampler';

export const routes: Routes = [
  { path: '', component: SamplerComponent },
  { path: '**', redirectTo: '' }
];
