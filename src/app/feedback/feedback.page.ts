import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';

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

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private toast: Toast
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
    this.haptic.medium();
    if (this.feedbackForm.invalid) {
      await this.toast.present('Please fill all required fields correctly', 'danger');
      return;
    }

    this.isSubmitting = true;

    setTimeout(async () => {
      await this.toast.present('Your feedback has been submitted successfully!', 'success');

      this.feedbackForm.reset({
        type: 'complaint',
        priority: 'medium',
      });

      this.isSubmitting = false;
    }, 1000);
  }

  goBack() {
    this.haptic.light();
    this.navCtrl.back();
  }
}
