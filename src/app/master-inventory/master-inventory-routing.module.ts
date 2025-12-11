import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MasterInventoryPage } from './master-inventory.page';

const routes: Routes = [
  {
    path: '',
    component: MasterInventoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterInventoryPageRoutingModule {}
