import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DispatchPageRoutingModule } from './dispatch-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DispatchPageRoutingModule,
  ],
})
export class DispatchPageModule {}
