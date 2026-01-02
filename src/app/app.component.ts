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

  // 👇 CHANGE: Default to TRUE so sidebar is HIDDEN initially.
  // This prevents the "flash" of the sidebar on the login page.
  isAuthPage = true; 

  constructor(private router: Router, private auth: Auth) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkAuthPage(event.url); // Extract logic to a function
        
        // Only fetch user data if we are NOT on an auth page
        if (!this.isAuthPage) {
          this.userRole = this.auth.getRoleType();
          this.userName = this.auth.getUsername();
        }
      });
      
    // 👇 ALSO CHECK ON LOAD (Handles manual refreshes or direct URL entry)
    // We check window.location.pathname immediately in constructor
    this.checkAuthPage(window.location.pathname);
  }

  // Helper function to centralize the logic
  checkAuthPage(url: string) {
    // List of pages where sidebar should be HIDDEN
    const authRoutes = ['/login', '/signup', '/forgot-password'];
    
    // Check if the current URL contains any of the auth routes
    // We use 'includes' to handle potential query params
    this.isAuthPage = authRoutes.some(route => url.includes(route));
    
    // Special case: If URL is exactly '/' (root), treat it as auth page 
    // because your router redirects '' -> 'login'
    if (url === '/' || url === '') {
      this.isAuthPage = true;
    }
  }

  logout() {
    console.log('Logout clicked');
    this.router.navigateByUrl('/login');
  }
}
