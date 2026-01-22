// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router, private auth: Auth) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    console.log('AuthGuard: Checking authentication...');
    
    // Use the Auth service's isLoggedIn method
    if (this.auth.isLoggedIn()) {
      console.log('AuthGuard: User is authenticated');
      return true;
    } else {
      console.log('AuthGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
  }
}