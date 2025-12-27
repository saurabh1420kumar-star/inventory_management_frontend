import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SidebarPage } from './sidebar.page';

const routes: Routes = [
  {
    path: '',
    component: SidebarPage
  },
    {
    path: 'dashboard',
    loadChildren: () => import('../dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'pending-approvals',
    loadChildren: () => import('../pending-approvals/pending-approvals.module').then( m => m.PendingApprovalsPageModule)

  },
  {
    path: 'master-inventory',
    loadChildren: () => import('../master-inventory/master-inventory.module').then( m => m.MasterInventoryPageModule)
  },
  {
    path: 'accounts-master',
    loadChildren: () => import('../accounts/accounts-master/accounts-master.module').then( m => m.AccountsMasterPageModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SidebarPageRoutingModule {}
