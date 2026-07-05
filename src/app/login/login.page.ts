// src/app/login/login.page.ts

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';

import { Auth } from '../services/auth';
import { Acl } from '../acl/acl';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class LoginPage {

  loginForm: FormGroup;
  showPassword = false;
  loading = false;

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private toast: Toast,
    private router: Router,
    private auth: Auth,
    private acl: Acl,
    private platform: Platform
  ) {
    this.loginForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.minLength(3)]
      ],
      password: [
        '',
        [Validators.required, Validators.minLength(6)]
      ]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility() {
    this.haptic.light();
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.haptic.medium();
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      this.toast.present('Please correct the errors in the form', 'warning');
      return;
    }

    const { username, password } = this.loginForm.value;
    this.loading = true;

    this.auth.login(username, password).subscribe({
      next: async (res) => {
        this.loading = false;

        const role = res.roleType?.toUpperCase() || '';
        const isMobile = Capacitor.isNativePlatform() || window.innerWidth < 768;

        // Distributor and Sales Officer accounts are only allowed on the mobile app
        if ((role === 'DISTRIBUTOR' || role === 'SALES_OFFICER') && !isMobile) {
          // Clear only auth keys — do NOT use localStorage.clear()
          ['auth_token','auth_token_type','auth_username','auth_user_id','auth_salesperson_id','auth_role_type','auth_features','auth_feature_names']
            .forEach(key => localStorage.removeItem(key));
          await this.toast.present(
            `${role === 'DISTRIBUTOR' ? 'Distributor' : 'Sales Officer'} login is only available on the mobile app.`,
            'warning'
          );
          return;
        }

        await this.toast.present(
          res.message || 'Login successful',
          'success'
        );

        // Route salespersons/sales managers to Sales Dashboard
        // Check for various sales-related roles
        const salesRoles = [
          'SALES',
          'SALESPERSON',
          'SALES_MANAGER',
          'SALES_OFFICER',
          'STATE_SALES_MGR',
          'AREA_SALES_MGR',
          'REGIONAL_SALES_MGR',
          'SALES_EXECUTIVE',
          'SALES_REP'
        ];
        
        if (salesRoles.some(salesRole => role.includes(salesRole))) {
          this.router.navigateByUrl('/sales/sales-dashboard', { replaceUrl: true });
        } else if (!isMobile && !this.auth.hasFeature('DASHBOARD')) {
          // Web (desktop) admin user without the Dashboard right — send them to the
          // first module they can access so they don't land on the hidden dashboard.
          // Mobile distributor and sales logins are unaffected (handled above / below).
          this.router.navigateByUrl(this.acl.getLandingRoute(), { replaceUrl: true });
        } else {
          this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        }
      },

      error: async (err) => {
        this.loading = false;
        console.error('[LOGIN] Login error:', err);

        const backendMsg = err?.error?.message || err?.error?.error;

        if (backendMsg) {
          await this.toast.present(backendMsg, 'warning');
        } else if (err.status === 401 || err.status === 403) {
          await this.toast.present('Invalid username or password', 'warning');
        } else {
          await this.toast.present(
            'Something went wrong. Please try again.',
            'danger'
          );
        }
      }
    });
  }



  goToSignup() {
    this.haptic.light();
    this.router.navigateByUrl('/signup');
  }

  forgotPassword() {
    this.haptic.light();
    this.router.navigateByUrl('/forgot-password');
  }
}