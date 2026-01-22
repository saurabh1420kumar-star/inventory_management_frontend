import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UserRightPage } from './user-right.page';

const routes: Routes = [
  {
    path: '',
    component: UserRightPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRightPageRoutingModule {}
