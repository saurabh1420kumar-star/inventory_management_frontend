import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SalesDistributorPage } from './sales-distributor.page';

const routes: Routes = [
  {
    path: '',
    component: SalesDistributorPage
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SalesDistributorPage
  ],
  exports: [RouterModule]
})
export class SalesDistributorPageRoutingModule { }
