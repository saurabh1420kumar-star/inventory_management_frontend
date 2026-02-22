import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SalesDistributorPageRoutingModule } from './sales-distributor-routing.module';
import { SalesDistributorPage } from './sales-distributor.page';

@NgModule({
  imports: [
    IonicModule,
    SalesDistributorPageRoutingModule,
    SalesDistributorPage
  ]
})
export class SalesDistributorPageModule { }
