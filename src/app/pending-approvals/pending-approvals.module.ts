import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PendingApprovalsPageRoutingModule } from './pending-approvals-routing.module';

import { PendingApprovalsPage } from './pending-approvals.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PendingApprovalsPageRoutingModule
  ],
  // declarations: [PendingApprovalsPage]
})
export class PendingApprovalsPageModule {}
