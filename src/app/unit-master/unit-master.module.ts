import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { UnitMasterPageRoutingModule } from './unit-master-routing.module';

import { UnitMasterPage } from './unit-master.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule,
    UnitMasterPageRoutingModule,
    UnitMasterPage
  ]
})
export class UnitMasterPageModule {}
