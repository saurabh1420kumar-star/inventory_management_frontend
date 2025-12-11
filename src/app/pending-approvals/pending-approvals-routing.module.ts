import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PendingApprovalsPage } from './pending-approvals.page';

const routes: Routes = [
  {
    path: '',
    component: PendingApprovalsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PendingApprovalsPageRoutingModule {}
