import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DistributorPageRoutingModule } from './distributor-routing.module';

import { DistributorPage } from './distributor.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DistributorPageRoutingModule
  ],
  // declarations: [DistributorPage]
})
export class DistributorPageModule {}
