import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OutwardInventoryPage } from './outward-inventory.page';

const routes: Routes = [
  {
    path: '',
    component: OutwardInventoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes), OutwardInventoryPage],
  exports: [RouterModule],
})
export class OutwardInventoryPageRoutingModule {}
