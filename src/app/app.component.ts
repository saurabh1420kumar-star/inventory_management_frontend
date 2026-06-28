import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './services/auth';
import { MenuController, Platform } from '@ionic/angular';
import { DistributorProfileService } from './services/distributor-profile.service';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

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

  get isSalesRole(): boolean {
    const role = this.userRole || '';
    return role.includes('SALES') || role === 'SALESPERSON' || role === 'NSM' || role === 'RSM' || role === 'TSM' || role === 'ASM';
  }

  private isDarkModeRole(role: string | null): boolean {
    if (!role) return false;
    return role.includes('SALES') || role === 'DISTRIBUTOR' ||
      role === 'SALESPERSON' || role === 'NSM' || role === 'RSM' ||
      role === 'TSM' || role === 'ASM';
  }

  private applyTheme(role: string | null): void {
    const isDark = this.isDarkModeRole(role);
    document.documentElement.classList.toggle('dark', isDark);
    this.syncStatusBar(isDark);
  }

  /**
   * Keeps the native Android status bar in sync with the role-based theme.
   * No-op on web. Style.Dark = light icons (for dark backgrounds),
   * Style.Light = dark icons (for light backgrounds).
   */
  private syncStatusBar(isDark: boolean): void {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    StatusBar.setBackgroundColor({ color: isDark ? '#0f172a' : '#ffffff' });
  }

  constructor(
    private router: Router,
    private auth: Auth,
    private menuController: MenuController,
    private platform: Platform,
    private distributorProfileService: DistributorProfileService
  ) {

    // 📱 Native-only setup (status bar base config + hardware back button)
    this.initNativeFeatures();

    // 🔁 Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateAuthPageState(event.urlAfterRedirects);

        // Only load user data when sidebar is allowed
        if (!this.isAuthPage) {
          this.userRole = this.auth.getRoleType();
          this.userName = this.auth.getUsername();
          this.applyTheme(this.userRole);
          if (this.userRole === 'DISTRIBUTOR') {
            this.distributorProfileService.loadProfile();
          }
        } else {
          this.userRole = null;
          this.userName = null;
          this.applyTheme(null);
        }
      });

    // 🔁 Handle direct refresh / initial load
    this.updateAuthPageState(window.location.pathname);
    this.applyTheme(this.auth.getRoleType());

    // Distributor profile is loaded in NavigationEnd handler (covers both fresh login and app refresh)
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

  /**
   * One-time native (Android) initialization.
   * - Status bar drawn behind the app content disabled so our color shows.
   * - Hardware back button: lowest priority so Ionic overlays/menu/router-outlet
   *   handle it first; only fires App.exitApp() when there is nothing left to pop.
   */
  private initNativeFeatures(): void {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setOverlaysWebView({ overlay: false });

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(-1, () => {
        App.exitApp();
      });
    });
  }

}