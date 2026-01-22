import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { UserRightPageRoutingModule } from './user-right-routing.module';
import { UserRightPage } from './user-right.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // ✅ Required for reactive forms
    IonicModule,
    UserRightPageRoutingModule
  ],
  // declarations: [UserRightPage]
})
export class UserRightPageModule {}