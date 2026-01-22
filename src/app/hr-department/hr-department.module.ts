import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HrDepartmentPageRoutingModule } from './hr-department-routing.module';

import { HrDepartmentPage } from './hr-department.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    HrDepartmentPageRoutingModule
  ],
  // declarations: [HrDepartmentPage]
})
export class HrDepartmentPageModule {}
