import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DistributorCartPageRoutingModule } from './distributor-cart-routing.module';
import { DistributorCartPage } from './distributor-cart.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    DistributorCartPageRoutingModule,
    DistributorCartPage
  ]
})
export class DistributorCartPageModule { }
