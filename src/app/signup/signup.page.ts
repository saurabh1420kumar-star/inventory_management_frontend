// src/app/pages/signup/signup.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Auth, CreateUserRequest } from '../services/auth';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { environment } from '../../environments/environment';

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
  selectedCategory: 'USER' | 'SALES' = 'USER';
  roles: { value: string; label: string }[] = [];
  salesRoles: { value: string; label: string }[] = [];
  zones: { value: string; label: string }[] = [];
  regions: { value: string; label: string }[] = [];
  isLoadingRoles = false;

  countries = [
    { value: 'USA', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CANADA', label: 'Canada' },
    { value: 'AUSTRALIA', label: 'Australia' },
    { value: 'INDIA', label: 'India' },
    { value: 'GERMANY', label: 'Germany' },
    { value: 'FRANCE', label: 'France' },
  ];

  genders = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ];

  bloodGroups = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  loading = false;

  private haptic = inject(HapticService);
  private http = inject(HttpClient);

  constructor(
    private fb: FormBuilder,
    private toast: Toast,
    private router: Router,
    private auth: Auth
  ) {
    this.signupForm = this.fb.group(
      {
        // Personal Information
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        dateOfBirth: ['', [Validators.required]],
        gender: ['', [Validators.required]],
        bloodGroup: [''],

        // Contact Information
        email: ['', [Validators.required, Validators.email]],
        contactNo: ['', [Validators.required]],
        alternateContactNo: [''],

        // Address Information
        completeAddress: ['', [Validators.required]],
        city: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zip: ['', [Validators.required]],

        // Employment Information
        employeeRollNo: ['', [Validators.required]],

        // Account Information
        username: ['', [Validators.required]],
        roleType: ['', [Validators.required]],

        // SALES-specific fields
        salesRole: [''],
        zone: [''],
        region: [''],

        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  ngOnInit() {
    this.loadRoles('user');
  }

  loadRoles(category: string): void {
    this.isLoadingRoles = true;
    const token = this.auth.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any[]>(`${environment.apiUrl}/admin/roles/by-category?category=${category}`, { headers })
      .subscribe({
        next: (roles: any[]) => {
          const mappedRoles = roles.map(r => ({ value: r.roleType, label: r.name }));
          if (category === 'user') {
            this.roles = mappedRoles;
          } else if (category === 'sales') {
            this.salesRoles = mappedRoles;
          }
          this.isLoadingRoles = false;
        },
        error: () => {
          this.isLoadingRoles = false;
          this.toast.present(`Could not load ${category} roles`, 'warning');
        }
      });
  }

  onCategoryChange(): void {
    if (this.selectedCategory === 'USER') {
      this.signupForm.get('roleType')?.setValidators([Validators.required]);
      this.signupForm.get('salesRole')?.clearValidators();
      this.signupForm.get('zone')?.clearValidators();
      this.signupForm.get('region')?.clearValidators();
      this.loadRoles('user');
    } else {
      this.signupForm.get('roleType')?.clearValidators();
      this.signupForm.get('salesRole')?.setValidators([Validators.required]);
      this.signupForm.get('zone')?.setValidators([Validators.required]);
      this.signupForm.get('region')?.setValidators([Validators.required]);
      this.loadRoles('sales');
    }

    this.signupForm.get('roleType')?.updateValueAndValidity();
    this.signupForm.get('salesRole')?.updateValueAndValidity();
    this.signupForm.get('zone')?.updateValueAndValidity();
    this.signupForm.get('region')?.updateValueAndValidity();
  }

  passwordsMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordsNotMatch: true };
  }

  async onSubmit() {
    this.haptic.medium();
    if (this.signupForm.invalid) {
      if (this.signupForm.errors?.['passwordsNotMatch']) {
        await this.toast.present('Passwords do not match', 'warning');
      } else {
        await this.toast.present('Please fill all required fields', 'warning');
      }
      return;
    }

    const v = this.signupForm.value;

    let payload: any;

    if (this.selectedCategory === 'USER') {
      payload = {
        userOnboardingType: 'USER',
        username: v.username,
        email: v.email,
        password: v.password,
        status: 'ACTIVE',
        firstName: v.firstName,
        lastName: v.lastName,
        contactNo: v.contactNo,
        alternateContactNo: v.alternateContactNo,
        bloodGroup: v.bloodGroup || 'O+',
        completeAddress: v.completeAddress,
        city: v.city,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender,
        country: v.country,
        zip: v.zip,
        roleType: v.roleType,
        employeeRollNo: v.employeeRollNo,
      };
    } else {
      payload = {
        userOnboardingType: 'SALES',
        username: v.username,
        email: v.email,
        password: v.password,
        status: 'ACTIVE',
        firstName: v.firstName,
        lastName: v.lastName,
        contactNo: v.contactNo,
        alternateContactNo: v.alternateContactNo,
        bloodGroup: v.bloodGroup || 'B+',
        completeAddress: v.completeAddress,
        city: v.city,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender,
        country: v.country,
        zip: v.zip,
        salesRole: v.salesRole,
        zone: v.zone,
        region: v.region,
        employeeRollNo: v.employeeRollNo,
      };
    }

    this.loading = true;

    this.auth.createUser(payload as CreateUserRequest).subscribe({
      next: async (res) => {
        this.loading = false;
        await this.toast.present(
          `Account created successfully for ${res.username}!`,
          'success'
        );
        this.router.navigateByUrl('/login');
      },
      error: async (err) => {
        this.loading = false;
        console.error('Signup error:', err);

        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'Failed to create account. Please try again.';
        await this.toast.present(msg, 'danger');
      },
    });
  }

  goToLogin(event?: Event): void {
    this.haptic.light();
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigateByUrl('/login');
  }
}