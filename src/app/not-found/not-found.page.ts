import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class NotFoundPage {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigateByUrl('/login');
  }

  goBack() {
    window.history.back();
  }
}
