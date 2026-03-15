import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ComplaintsService } from '../services/complaints.service';

@Component({
  selector: 'app-complaints',
  templateUrl: './complaints.page.html',
  styleUrls: ['./complaints.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
})
export class ComplaintsPage implements OnInit {
  complaintForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showSuccess = false;

  categories = ['PAYMENT', 'PRODUCT', 'SERVICE', 'DELIVERY', 'OTHER'];
  priorityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  constructor(
    private fb: FormBuilder,
    private complaintsService: ComplaintsService
  ) {
    this.complaintForm = this.fb.group({
      type: ['COMPLAINT'],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      category: ['PAYMENT', Validators.required],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      priorityLevel: ['LOW', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20)]],
    });
  }

  ngOnInit() {}

  submitComplaint() {
    console.log('Submit button clicked');
    console.log('Form valid:', this.complaintForm.valid);
    console.log('Form data:', this.complaintForm.value);
    
    if (this.complaintForm.invalid) {
      console.log('Form is invalid. Errors:', this.complaintForm.errors);
      Object.keys(this.complaintForm.controls).forEach(key => {
        const control = this.complaintForm.get(key);
        if (control?.invalid) {
          console.log(`${key} is invalid:`, control.errors);
        }
      });
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    console.log('Submitting complaint with data:', this.complaintForm.value);

    this.complaintsService.createComplaint(this.complaintForm.value).subscribe({
      next: (response) => {
        console.log('Complaint created:', response);
        this.isLoading = false;
        this.successMessage = 'Complaint submitted successfully. We will review it shortly.';
        this.showSuccess = true;
        this.complaintForm.reset({
          type: 'COMPLAINT',
          category: 'PAYMENT',
          priorityLevel: 'LOW'
        });
        setTimeout(() => this.showSuccess = false, 5000);
      },
      error: (err) => {
        console.error('Error submitting complaint:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.error?.message);
        console.error('Error response:', err?.error);
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to submit complaint. Please try again.';
      },
    });
  }

  resetForm() {
    this.complaintForm.reset({
      type: 'COMPLAINT',
      category: 'PAYMENT',
      priorityLevel: 'LOW'
    });
    this.errorMessage = '';
    this.successMessage = '';
  }
}
