import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SalesPageRoutingModule } from './sales-routing.module';
import { SalesPage } from './sales.page';

@NgModule({
  imports: [
    IonicModule,
    SalesPageRoutingModule,
    SalesPage
  ]
})
export class SalesPageModule { }
