import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { OutwardInventoryPageRoutingModule } from './outward-inventory-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    OutwardInventoryPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OutwardInventoryPageModule {}
