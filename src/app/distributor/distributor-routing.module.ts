import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DistributorPage } from './distributor.page';

const routes: Routes = [
  {
    path: '',
    component: DistributorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DistributorPageRoutingModule {}
