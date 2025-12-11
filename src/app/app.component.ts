import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './services/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {

  userRole: string | null = null;

  userName: string | null = null;

  isAuthPage = false;

  constructor(private router: Router, private auth: Auth) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Hide sidebar on login and signup pages
        this.isAuthPage = event.url.includes('/login') || event.url.includes('/signup');

        this.userRole = this.auth.getRoleType();

        this.userName = this.auth.getUsername();
      });
  }


  // userRole: any = 'admin';

  logout() {
    console.log('Logout clicked');
    this.router.navigateByUrl('/login');
    // Add your logout logic here
  }
}
