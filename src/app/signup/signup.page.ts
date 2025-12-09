import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class SignupPage implements OnInit {

  signupForm: FormGroup;

  countries = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'in', label: 'India' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
  ];

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private router: Router
  ) {
    this.signupForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        city: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zip: ['', [Validators.required]],
        username: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  ngOnInit() {
  }

  passwordsMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordsNotMatch: true };
  }

  async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }

  async onSubmit() {
    if (this.signupForm.invalid) {
      if (this.signupForm.errors?.['passwordsNotMatch']) {
        await this.presentToast('Passwords do not match', 'danger');
      } else {
        await this.presentToast('Please fill all required fields', 'danger');
      }
      return;
    }

    const data = this.signupForm.value;
    console.log('Signup data:', data);

    // TODO: call your API here

    await this.presentToast(
      'Account Created. Welcome to Nexus! Please login to continue.'
    );
    this.router.navigateByUrl('/login');
  }

  goToLogin(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigateByUrl('/login');
  }
}