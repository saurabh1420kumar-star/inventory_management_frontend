// src/app/guards/acl.guard.ts

import { Injectable } from '@angular/core';
import {
  Router,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { Auth } from '../services/auth';
import { Acl } from '../acl/acl';

@Injectable({
  providedIn: 'root',
})
export class AclGuard implements CanActivate {

  constructor(
    private router: Router,
    private auth: Auth,
    private acl: Acl
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {

    // 🔐 1. User must be logged in
    if (!this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return false;
    }

    // ✅ 2. Routes explicitly allowed for all logged-in users
    if (route.data['allowAll'] === true) {
      return true;
    }

    // 🚫 3. BLOCK users with NO features at all
    if (!this.acl.hasAnyFeature()) {
      console.warn('Access denied: No features assigned to user');
      this.router.navigateByUrl('/unauthorized');
      return false;
    }

    // 🔑 4. Feature-based route protection
    const requiredFeature = route.data['feature'] as string | undefined;

    if (requiredFeature && !this.acl.can(requiredFeature)) {
      console.warn(`Access denied: Missing feature ${requiredFeature}`);
      this.router.navigateByUrl('/unauthorized');
      return false;
    }

    // ✅ 5. Access granted
    return true;
  }
}
