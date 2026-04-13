// sidebar.page.ts

import { Component, OnInit, OnDestroy, HostBinding, HostListener, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AclDirective } from '../acl/acl.directive';
import { LogoutComponent } from '../logout/logout.component';
import { Capacitor } from '@capacitor/core';
import { HapticService } from '../services/haptic.service';
import { DistributorProfileService } from '../services/distributor-profile.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.page.html',
  styleUrls: ['./sidebar.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    LogoutComponent,
    AclDirective,
  ],
})
export class SidebarPage implements OnInit, OnDestroy {

  userName: string | null = null;
  userRole: string | null = null;
  isMobile: boolean = false;
  
  // Global profile state
  distributorProfile: any = null;
  showProfileModal: boolean = false;

  // Accept collapsed state from parent
  @Input() collapsed = false;
  
  // Emit toggle event to parent
  @Output() toggleSidebar = new EventEmitter<void>();

  // For backward compatibility with template
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  @HostBinding('class.collapsed')
  get collapsedClass() {
    return this.collapsed;
  }

  private static readonly MOBILE_BREAKPOINT = 768;

  private haptic = inject(HapticService);

  constructor(
    private auth: Auth,
    private router: Router,
    private distributorProfileService: DistributorProfileService
  ) {}

  ngOnInit() {
    this.userName = this.auth.getUsername();
    this.userRole = this.auth.getRoleType();
    this.checkMobile();
    
    // Subscribe to global profile
    this.distributorProfileService.getProfile$().subscribe(profile => {
      this.distributorProfile = profile;
    });
  }

  ngOnDestroy() {}

  /**
   * Open the global profile modal
   */
  openProfileModal() {
    this.haptic.medium();
    this.showProfileModal = true;
  }

  /**
   * Close the global profile modal
   */
  closeProfileModal() {
    this.haptic.light();
    this.showProfileModal = false;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  get isDesktop(): boolean {
    return !this.isMobile;
  }

  get isAdmin(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'SUPER_ADMIN';
  }

  private checkMobile() {
    this.isMobile = Capacitor.isNativePlatform() || window.innerWidth < SidebarPage.MOBILE_BREAKPOINT;
    // Debug log
    console.log('Mobile Check:', {
      isNativePlatform: Capacitor.isNativePlatform(),
      windowWidth: window.innerWidth,
      breakpoint: SidebarPage.MOBILE_BREAKPOINT,
      isMobile: this.isMobile,
      userRole: this.userRole
    });
  }

  onToggleSidebar() {
    this.haptic.light();
    this.toggleSidebar.emit();
  }

  onMenuItemClick() {
    this.haptic.light();
    this.toggleSidebar.emit();
  }

  logout() {
    this.haptic.heavy();
    this.auth.logout?.();
    this.router.navigateByUrl('/login');
  }
}