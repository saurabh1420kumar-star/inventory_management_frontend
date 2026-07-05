// src/app/guards/dashboard.guard.ts

import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Auth } from '../services/auth';
import { Acl } from '../acl/acl';

/**
 * Protects the /dashboard route.
 *
 * Scope: web (admin-panel) users only. Distributor, dealer and sales roles use
 * /dashboard for their own role-specific view, so this guard lets them straight
 * through (fail-open) and never changes their flow. A plain web-admin user must
 * hold the DASHBOARD feature; if they don't, they're redirected to the first
 * module they can actually open — so refreshing or typing /dashboard can't land
 * them on the hidden dashboard.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardGuard implements CanActivate {

  constructor(
    private router: Router,
    private auth: Auth,
    private acl: Acl
  ) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return false;
    }

    const role = this.auth.getRoleType()?.toUpperCase() || '';
    const isSalesRole =
      role.includes('SALES') ||
      ['SALESPERSON', 'NSM', 'RSM', 'TSM', 'ASM'].includes(role);

    // Roles that use /dashboard as their own landing view — always allow.
    if (role === 'DISTRIBUTOR' || role === 'DEALER' || isSalesRole) {
      return true;
    }

    // Web-admin users need the DASHBOARD feature (SUPER_ADMIN passes via can()).
    if (this.acl.can('DASHBOARD')) {
      return true;
    }

    this.router.navigateByUrl(this.acl.getLandingRoute(), { replaceUrl: true });
    return false;
  }
}
