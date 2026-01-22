import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './services/auth';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {

  userRole: string | null = null;
  userName: string | null = null;

  /**
   * Sidebar visibility flag
   * true  → Auth pages (login, signup, etc.)
   * false → App pages (dashboard, others)
   */
  isAuthPage = false; // ✅ default TRUE to avoid sidebar flash

  /**
   * Sidebar collapsed state
   * false → Expanded (240px)
   * true  → Collapsed (60px)
   */
  sidebarCollapsed = false;
  isDesktop = window.innerWidth >= 992;

  constructor(
    private router: Router,
    private auth: Auth,
    private menuController: MenuController
  ) {

    // 🔁 Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateAuthPageState(event.urlAfterRedirects);

        // Only load user data when sidebar is allowed
        if (!this.isAuthPage) {
          this.userRole = this.auth.getRoleType();
          this.userName = this.auth.getUsername();
        } else {
          this.userRole = null;
          this.userName = null;
        }
      });

    // 🔁 Handle direct refresh / initial load
    this.updateAuthPageState(window.location.pathname);
  }

  /**
   * Determines whether current route is an auth page
   */
  private updateAuthPageState(url: string): void {
    const authRoutes = ['/login', '/signup', '/forgot-password'];

    this.isAuthPage = authRoutes.some(route => url.includes(route));

    // Root path redirects to login
    if (url === '/' || url === '') {
      this.isAuthPage = true;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth >= 992;
  }

  onSidebarToggle() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileMenu(): void {
    this.menuController.toggle();
  }

  logout(): void {
    this.auth.logout();        // ✅ clear storage
    this.router.navigateByUrl('/login');
  }

}