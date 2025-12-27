import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccountsMasterPage } from './accounts-master.page';

const routes: Routes = [
  {
    path: '',
    component: AccountsMasterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountsMasterPageRoutingModule {}
