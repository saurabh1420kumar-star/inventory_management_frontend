import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonicModule,
  ToastController 
} from '@ionic/angular';
import { CommonModule } from '@angular/common';

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

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
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
    if (this.loginForm.invalid) {
      await this.presentToast('Please fill in all fields', 'danger');
      return;
    }

    const { username, password } = this.loginForm.value;
    console.log('Login data:', { username, password });

    // TODO: replace with real API call
    await this.presentToast('Welcome back! Successfully logged in to Nexus');
    this.router.navigateByUrl('/dashboard'); // configure this route later
  }

  goToSignup() {
    this.router.navigateByUrl('/signup');
  }

  forgotPassword() {
    // TODO: implement forgot password flow
    console.log('Forgot password clicked');
  }
}