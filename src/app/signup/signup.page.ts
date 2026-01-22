// src/app/pages/signup/signup.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth, CreateUserRequest } from '../services/auth';
import { Toast } from '../services/toast';

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
    { value: 'USA', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CANADA', label: 'Canada' },
    { value: 'AUSTRALIA', label: 'Australia' },
    { value: 'INDIA', label: 'India' },
    { value: 'GERMANY', label: 'Germany' },
    { value: 'FRANCE', label: 'France' },
  ];

  roles = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'BUSINESS_DEV_MGR', label: 'Business Dev Manager' },
    { value: 'PLANT_MGR', label: 'Plant Manager' },
    { value: 'HR_MGR', label: 'HR Manager' },
    { value: 'LOGISTICS_MGR', label: 'Logistics Manager' },
    { value: 'ACCOUNT_MGR', label: 'Account Manager' },
    { value: 'ACCOUNT_OFFICER', label: 'Account Officer' },
    { value: 'ACCOUNT_EXECUTIVE', label: 'Account Executive' },
    { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager' },
    { value: 'STATE_SALES_MGR', label: 'State Sales Manager' },
    { value: 'ZONAL_SALES_MGR', label: 'Zonal Sales Manager' },
    { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager' },
    { value: 'AREA_SALES_MGR', label: 'Area Sales Manager' },
    { value: 'SALES_OFFICER', label: 'Sales Officer' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
    { value: 'LOGISTICS_OFFICER', label: 'Logistics Officer' },
    { value: 'HR_EXECUTIVE', label: 'HR Executive' },
    { value: 'PLANT_OFFICER', label: 'Plant Officer' },
    { value: 'PLANT_EXECUTIVE', label: 'Plant Executive' },
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
        
        // Account Information
        username: ['', [Validators.required]],
        roleType: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  ngOnInit() {}

  passwordsMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { passwordsNotMatch: true };
  }

  async onSubmit() {
    if (this.signupForm.invalid) {
      if (this.signupForm.errors?.['passwordsNotMatch']) {
        await this.toast.present('Passwords do not match', 'warning');
      } else {
        await this.toast.present('Please fill all required fields', 'warning');
      }
      return;
    }

    const v = this.signupForm.value;

    const payload: CreateUserRequest = {
      username: v.username,
      email: v.email,
      password: v.password,
      status: 'ACTIVE',
      firstName: v.firstName,
      lastName: v.lastName,
      contactNo: v.contactNo,
      alternateContactNo: v.alternateContactNo, // Default to contactNo if not provided
      bloodGroup: v.bloodGroup || 'O+', // Default to O+ if not provided
      completeAddress: v.completeAddress,
      city: v.city,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      country: v.country,
      zip: v.zip,
      roleType: v.roleType,
      dateOfBirth: '',
      gender: '',
      completeAddress: ''
    };

    this.loading = true;

    this.auth.createUser(payload).subscribe({
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
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigateByUrl('/login');
  }
}