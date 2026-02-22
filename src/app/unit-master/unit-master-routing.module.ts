import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UnitMasterPage } from './unit-master.page';

const routes: Routes = [
  {
    path: '',
    component: UnitMasterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UnitMasterPageRoutingModule {}
