import { Routes } from '@angular/router';
import {InterfaceComponent} from './interface/interface.component';
import {ResultPageComponent} from "./interface/result-page/result-page.component";

export const routes: Routes = [
  { path: '', redirectTo: '/interface', pathMatch: 'full' },
  { path: 'interface', component: InterfaceComponent },
  { path: 'interface/result', component: ResultPageComponent }
];
