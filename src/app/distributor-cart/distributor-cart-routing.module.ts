import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DistributorCartPage } from './distributor-cart.page';

const routes: Routes = [
  {
    path: '',
    component: DistributorCartPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DistributorCartPageRoutingModule { }
