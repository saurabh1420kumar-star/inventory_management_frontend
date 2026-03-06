import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { Auth } from '../services/auth';
import { Toast } from '../services/toast';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class ForgotPasswordPage {
  /** Which step the user is on: 1 = enter username, 2 = set new password, 3 = success */
  step: 1 | 2 | 3 = 1;

  usernameForm: FormGroup;
  passwordForm: FormGroup;

  showNewPassword = false;
  showConfirmPassword = false;
  loading = false;
  enteredUsername = '';

  /** Password‐strength score 0‑4 */
  strengthScore = 0;
  strengthLabel = '';
  strengthColor = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth,
    private toast: Toast
  ) {
    // Step 1 – username
    this.usernameForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
    });

    // Step 2 – new password + confirm
    this.passwordForm = this.fb.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    // Watch password changes for strength meter
    this.passwordForm.get('newPassword')?.valueChanges.subscribe((val) => {
      this.evaluateStrength(val);
    });
  }

  // ─── Validators ────────────────────────────────────────
  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('newPassword')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordsMismatch: true };
  }

  // ─── Strength meter ────────────────────────────────────
  evaluateStrength(password: string) {
    let score = 0;
    if (!password) {
      this.strengthScore = 0;
      this.strengthLabel = '';
      this.strengthColor = '';
      return;
    }
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    this.strengthScore = score;

    const map: Record<number, { label: string; color: string }> = {
      0: { label: '', color: '' },
      1: { label: 'Weak', color: '#ef4444' },
      2: { label: 'Fair', color: '#f97316' },
      3: { label: 'Good', color: '#eab308' },
      4: { label: 'Strong', color: '#22c55e' },
    };
    this.strengthLabel = map[score].label;
    this.strengthColor = map[score].color;
  }

  // ─── Step navigation ──────────────────────────────────
  goToStep2() {
    this.usernameForm.markAllAsTouched();
    if (this.usernameForm.invalid) return;
    this.enteredUsername = this.usernameForm.value.username.trim();
    this.step = 2;
  }

  backToStep1() {
    this.step = 1;
    this.passwordForm.reset();
    this.strengthScore = 0;
    this.strengthLabel = '';
    this.strengthColor = '';
  }

  // ─── Submit ────────────────────────────────────────────
  resetPassword() {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    this.loading = true;
    const { newPassword, confirmPassword } = this.passwordForm.value;

    this.auth.forgotPassword(this.enteredUsername, newPassword, confirmPassword).subscribe({
      next: async (res: any) => {
        this.loading = false;
        this.step = 3;
        await this.toast.present(
          res?.message || 'Password reset successfully!',
          'success'
        );
      },
      error: async (err: any) => {
        this.loading = false;
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          'Something went wrong. Please try again.';
        await this.toast.present(msg, 'danger');
      },
    });
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  // ─── Password checklist helpers ─────────────────────────
  hasUpper(val: string): boolean {
    return /[A-Z]/.test(val || '');
  }

  hasNumber(val: string): boolean {
    return /[0-9]/.test(val || '');
  }

  hasSpecial(val: string): boolean {
    return /[^A-Za-z0-9]/.test(val || '');
  }
}
