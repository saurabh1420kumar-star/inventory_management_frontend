import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ComplaintsService } from '../services/complaints.service';
import { HapticService } from '../services/haptic.service';
import { Auth } from '../services/auth';
import { UserService } from '../services/user.service';
import { environment } from '../../environments/environment';

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
  complaintDate = new Date().toISOString().split('T')[0];

  categories = ['PAYMENT', 'ACCOUNT', 'TECHNICAL', 'DELIVERY', 'OTHER'];
  priorityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private complaintsService: ComplaintsService,
    private auth: Auth,
    private userService: UserService,
    private http: HttpClient
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

  ngOnInit() {
    this.autofillCurrentUser();
  }

  private autofillCurrentUser() {
    const currentUserId = this.auth.getUserId();
    if (!currentUserId) {
      this.fillFromAuthDefaults();
      return;
    }

    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const currentUser = users.find((u: any) => Number(u.id) === Number(currentUserId));
        if (currentUser) {
          this.patchComplaintUser({
            fullName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
            emailAddress: currentUser.email || '',
            phoneNumber: currentUser.contactNo || ''
          });
          return;
        }
        this.autofillFromProfileApi(currentUserId);
      },
      error: () => {
        this.autofillFromProfileApi(currentUserId);
      }
    });
  }

  private autofillFromProfileApi(userId: number) {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    this.http.get<any>(`${environment.apiUrl}/distributors/${userId}`, { headers }).subscribe({
      next: (res) => {
        const profile = res?.data ?? res ?? {};
        this.patchComplaintUser({
          fullName: profile.distributorName || profile.name || this.auth.getUsername() || '',
          emailAddress: profile.contactEmail || profile.email || '',
          phoneNumber: profile.phoneNumber || profile.mobileNumber || profile.phone || profile.contactNo || ''
        });
      },
      error: () => {
        this.fillFromAuthDefaults();
      }
    });
  }

  private patchComplaintUser(data: { fullName?: string; emailAddress?: string; phoneNumber?: string }) {
    this.complaintForm.patchValue({
      fullName: (data.fullName || '').trim(),
      emailAddress: data.emailAddress || '',
      phoneNumber: data.phoneNumber || ''
    });
  }

  private fillFromAuthDefaults() {
    this.patchComplaintUser({
      fullName: this.auth.getUsername() || '',
      emailAddress: '',
      phoneNumber: ''
    });
  }

  submitComplaint() {
    this.haptic.medium();
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
    console.log('🚀 Submitting complaint with data:', this.complaintForm.value);

    this.complaintsService.createComplaint(this.complaintForm.value).subscribe({
      next: (response) => {
        console.log('✨ Complaint created successfully:', response);
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
        console.error('❌ Error submitting complaint:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.error?.message);
        console.error('Full error response:', err?.error);
        
        this.isLoading = false;
        
        // Check for specific error types
        if (err?.status === 0) {
          this.errorMessage = 'Network error. Please check your internet connection.';
        } else if (err?.status === 401 || err?.status === 403) {
          this.errorMessage = 'Unauthorized. Please login again.';
        } else if (err?.status === 400) {
          this.errorMessage = err?.error?.message || 'Invalid form data. Please check your input.';
        } else if (err?.status >= 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else {
          this.errorMessage = err?.error?.message || 'Failed to submit complaint. Please try again.';
        }
      },
    });
  }

  resetForm() {
    this.complaintDate = new Date().toISOString().split('T')[0];
    this.complaintForm.reset({
      type: 'COMPLAINT',
      category: 'PAYMENT',
      priorityLevel: 'LOW'
    });
    this.errorMessage = '';
    this.successMessage = '';
  }
}
