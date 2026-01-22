// src/app/login/login.page.ts

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { Auth } from '../services/auth';
import { Toast } from '../services/toast';

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

  constructor(
    private fb: FormBuilder,
    private toast: Toast,
    private router: Router,
    private auth: Auth
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
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
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

        await this.toast.present(
          res.message || 'Login successful',
          'success'
        );

        // 🔥 ROLE-BASED NAVIGATION
        this.navigateByRole(res.roleType);
      },

      error: async (err) => {
        this.loading = false;
        console.error('Login error:', err);

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

  /**
   * Navigate user based on their role after successful login
   */
  private navigateByRole(roleType: string) {
    switch (roleType) {
      case 'SUPER_ADMIN':
        // SUPER_ADMIN → Pending Approvals
        this.router.navigateByUrl('/pending-approvals', { replaceUrl: true });
        break;

      case 'ADMIN':
        // ADMIN → Dashboard (no pending approvals access)
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        break;

      case 'USER':
      default:
        // Regular users → Dashboard
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        break;
    }
  }

  goToSignup() {
    this.router.navigateByUrl('/signup');
  }

  forgotPassword() {
    console.log('Forgot password clicked');
    // Implement forgot password logic
  }
}