// sidebar.page.ts

import { Component, OnInit, OnDestroy, HostBinding, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AclDirective } from '../acl/acl.directive';
import { LogoutComponent } from '../logout/logout.component';
import { Capacitor } from '@capacitor/core';

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

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit() {
    this.userName = this.auth.getUsername();
    this.userRole = this.auth.getRoleType();
    this.checkMobile();
  }

  ngOnDestroy() {}

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
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onMenuItemClick() {
    if (this.isMobile) {
      this.toggleSidebar.emit();
    }
  }

  logout() {
    this.auth.logout?.();
    this.router.navigateByUrl('/login');
  }
}