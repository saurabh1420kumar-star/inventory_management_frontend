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
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.toast.present('Please fill in all fields', 'warning');
      return;
    }

    const { username, password } = this.loginForm.value;
    this.loading = true;

    this.auth.login(username, password).subscribe({
      next: async (res) => {
        this.loading = false;

        // success toast
        await this.toast.present(res.message || 'Login successful', 'success');

        // 🔥 redirect based on role
        if (res.roleType === 'ADMIN') {
          this.router.navigateByUrl('/pending-approvals');
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: async (err) => {
        this.loading = false;
        console.error('Login error:', err);

        const backendMsg = err?.error?.error || err?.error?.message;

        if (backendMsg) {
          await this.toast.present(backendMsg, 'warning');
        } else if (err.status === 401 || err.status === 403) {
          await this.toast.present('Invalid username or password', 'warning');
        } else {
          await this.toast.present('Something went wrong. Please try again.', 'danger');
        }
      },
    });
  }

  goToSignup() {
    this.router.navigateByUrl('/signup');
  }

  forgotPassword() {
    console.log('Forgot password clicked');
  }
}
