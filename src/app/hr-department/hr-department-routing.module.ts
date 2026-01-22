import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HrDepartmentPage } from './hr-department.page';

const routes: Routes = [
  {
    path: '',
    component: HrDepartmentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HrDepartmentPageRoutingModule {}
