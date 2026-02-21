import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Auth } from '../services/auth';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss'],
})
export class LogoutComponent {

  constructor(private auth: Auth, private router: Router) {
    addIcons({ 'log-out-outline': logOutOutline });
  }

  logout() {
    this.auth.logoutApi().subscribe({
      next: () => {
        this.auth.logout();                 // clear localStorage
        this.router.navigateByUrl('/login'); // go to login
      },
      error: () => {
        this.auth.logout();                 // force logout even if server fails
        this.router.navigateByUrl('/login');
      }
    });
  }
}
