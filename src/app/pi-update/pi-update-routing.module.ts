import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PiUpdatePage } from './pi-update.page';

const routes: Routes = [
  {
    path: '',
    component: PiUpdatePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PiUpdatePageRoutingModule {}
