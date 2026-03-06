import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LogisticsPage } from './logistics.page';

const routes: Routes = [
  {
    path: '',
    component: LogisticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LogisticsPageRoutingModule {}
