import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MasterInventoryPageRoutingModule } from './master-inventory-routing.module';

import { MasterInventoryPage } from './master-inventory.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MasterInventoryPageRoutingModule
  ],
  //  declarations: [MasterInventoryPage]
})
export class MasterInventoryPageModule {}
