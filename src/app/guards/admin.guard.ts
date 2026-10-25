// src/app/guards/admin.guard.ts
// Role-only gate: ADMIN and SUPER_ADMIN pass, everyone else is turned away regardless of feature grants.

import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return false;
    }

    const role = this.auth.getRoleType();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return true;
    }

    console.warn(`Access denied: role ${role} is not ADMIN / SUPER_ADMIN`);
    this.router.navigateByUrl('/unauthorized');
    return false;
  }
}
