import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';  // ← Add TitleCasePipe
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AccountsMasterPageRoutingModule } from './accounts-master-routing.module';
import { AccountsMasterPage } from './accounts-master.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AccountsMasterPageRoutingModule
  ],
})
export class AccountsMasterPageModule {}
