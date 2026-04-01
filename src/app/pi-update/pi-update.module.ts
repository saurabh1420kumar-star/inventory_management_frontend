import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PiUpdatePageRoutingModule } from './pi-update-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PiUpdatePageRoutingModule,
  ],
})
export class PiUpdatePageModule {}
