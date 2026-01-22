import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MachineInventoryPageRoutingModule } from './machine-inventory-routing.module';
import { MachineInventoryPage } from './machine-inventory.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MachineInventoryPageRoutingModule
  ],
 // declarations: [MachineInventoryPage],   // <-- REQUIRED
  schemas: [CUSTOM_ELEMENTS_SCHEMA]       // <-- REQUIRED for ion-icon, ion-button, etc
})
export class MachineInventoryPageModule {}
