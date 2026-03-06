import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DispatchPage } from './dispatch.page';

const routes: Routes = [
  {
    path: '',
    component: DispatchPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DispatchPageRoutingModule {}
