import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MachineInventoryPage } from './machine-inventory.page';

const routes: Routes = [
  {
    path: '',
    component: MachineInventoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MachineInventoryPageRoutingModule {}
