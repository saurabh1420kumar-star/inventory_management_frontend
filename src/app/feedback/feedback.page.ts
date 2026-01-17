import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.page.html',
  styleUrls: ['./feedback.page.scss'],
  standalone: true,                // ✅ REQUIRED
  imports: [
    CommonModule,
    IonicModule,                   // ✅ REQUIRED
    ReactiveFormsModule
  ]
})
export class FeedbackPage {

  feedbackForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    this.feedbackForm = this.fb.group({
      type: ['complaint', Validators.required],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.maxLength(20)],
      category: ['', Validators.required],
      subject: ['', [Validators.required, Validators.maxLength(150)]],
      priority: ['medium'],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
    });
  }

  async submit() {
    if (this.feedbackForm.invalid) {
      const toast = await this.toastCtrl.create({
        message: 'Please fill all required fields correctly',
        color: 'danger',
        duration: 2000,
      });
      toast.present();
      return;
    }

    this.isSubmitting = true;

    setTimeout(async () => {
      const toast = await this.toastCtrl.create({
        message: 'Your feedback has been submitted successfully!',
        color: 'success',
        duration: 2000,
      });
      toast.present();

      this.feedbackForm.reset({
        type: 'complaint',
        priority: 'medium',
      });

      this.isSubmitting = false;
    }, 1000);
  }

  goBack() {
    this.navCtrl.back();
  }
}
