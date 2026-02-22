import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-sales-distributor',
  templateUrl: './sales-distributor.page.html',
  styleUrls: ['./sales-distributor.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule]
})
export class SalesDistributorPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
