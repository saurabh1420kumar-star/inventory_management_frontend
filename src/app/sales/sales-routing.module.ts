import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesPage } from './sales.page';

const routes: Routes = [
  {
    path: '',
    component: SalesPage
  },
  {
    path: 'salesperson-onboarding',
    loadComponent: () =>
      import('./salesperson-onboarding/salesperson-onboarding.page').then(
        m => m.SalespersonOnboardingPage
      )
  },
  {
    path: 'hierarchy-orders',
    loadComponent: () =>
      import('./hierarchy-orders/hierarchy-orders.page').then(
        m => m.HierarchyOrdersPage
      )
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes), SalesPage],
  exports: [RouterModule]
})
export class SalesPageRoutingModule { }
