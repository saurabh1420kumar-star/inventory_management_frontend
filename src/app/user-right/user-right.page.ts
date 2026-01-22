import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-user-right',
  templateUrl: './user-right.page.html',
  styleUrls: ['./user-right.page.scss'],
  standalone: true, // ✅ Standalone component like your signup page
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class UserRightPage implements OnInit {
  isEditMode = false;
  isSaving = false;
  profileForm!: FormGroup;
  
  // User profile data (you can fetch this from a service/API)
  userProfile: any = {
    firstName: 'Rajesh',
    lastName: 'Kumar',
    email: 'rajesh.kumar@example.com',
    contactNo: '+919876543210',
    city: 'Mumbai',
    country: 'India',
    zip: '400001',
    username: 'rajeshk',
    roleType: 'admin',
    profileImage: '', // URL to profile image
    memberSince: 'Jan 2024',
    productsManaged: 142,
    tasksCompleted: 89
  };

  // Backup for cancel functionality
  private originalProfile: any;

  // Countries list (India only)
  countries = [
    { label: 'India', value: 'IN' }
  ];

  // Roles list
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

  constructor(
    private formBuilder: FormBuilder,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.initializeForm();
    // TODO: Fetch user profile from your service/API
    // this.loadUserProfile();
  }

  /**
   * Initialize the profile form with validators
   */
  initializeForm() {
    this.profileForm = this.formBuilder.group({
      firstName: [this.userProfile.firstName, [Validators.required, Validators.minLength(2)]],
      lastName: [this.userProfile.lastName, [Validators.required, Validators.minLength(2)]],
      email: [this.userProfile.email, [Validators.required, Validators.email]],
      contactNo: [this.userProfile.contactNo, [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      city: [this.userProfile.city, Validators.required],
      country: [this.userProfile.country, Validators.required],
      zip: [this.userProfile.zip, [Validators.required, Validators.pattern(/^[0-9]{6}$/)]], // Indian PIN code format
      username: [this.userProfile.username, [Validators.required, Validators.minLength(3)]],
      roleType: [this.userProfile.roleType, Validators.required]
    });
  }

  /**
   * Get user initials for avatar
   */
  getInitials(): string {
    const first = this.userProfile?.firstName?.[0] || '';
    const last = this.userProfile?.lastName?.[0] || '';
    return (first + last).toUpperCase();
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    this.isEditMode = true;
    // Store original values for cancel functionality
    this.originalProfile = { ...this.userProfile };
    // Populate form with current values
    this.profileForm.patchValue(this.userProfile);
  }

  /**
   * Save profile changes
   */
  async saveProfile() {
    if (this.profileForm.invalid) {
      await this.showToast('Please fill all required fields correctly', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Changes',
      message: 'Are you sure you want to save these changes?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: () => {
            this.performSave();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Perform the actual save operation
   */
  async performSave() {
    this.isSaving = true;

    try {
      // Get form values
      const formData = this.profileForm.value;
      
      // TODO: Call your API service to save the profile
      // await this.userService.updateProfile(formData);
      
      // Simulate API call
      await this.delay(1500);

      // Update local profile data
      this.userProfile = { ...this.userProfile, ...formData };
      
      this.isEditMode = false;
      await this.showToast('Profile updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      await this.showToast('Failed to update profile. Please try again.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Cancel edit mode and restore original values
   */
  async cancelEdit() {
    if (this.profileForm.dirty) {
      const alert = await this.alertController.create({
        header: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        buttons: [
          {
            text: 'Continue Editing',
            role: 'cancel'
          },
          {
            text: 'Discard',
            role: 'destructive',
            handler: () => {
              this.performCancel();
            }
          }
        ]
      });

      await alert.present();
    } else {
      this.performCancel();
    }
  }

  /**
   * Perform the cancel operation
   */
  performCancel() {
    // Restore original values
    this.userProfile = { ...this.originalProfile };
    this.profileForm.patchValue(this.userProfile);
    this.isEditMode = false;
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture() {
    const alert = await this.alertController.create({
      header: 'Upload Profile Picture',
      message: 'Choose an option:',
      buttons: [
        {
          text: 'Take Photo',
          handler: () => {
            this.takePhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          handler: () => {
            this.chooseFromGallery();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Take a photo using camera
   */
  async takePhoto() {
    // TODO: Implement camera functionality using Capacitor Camera plugin
    // import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
    
    try {
      // const image = await Camera.getPhoto({
      //   quality: 90,
      //   allowEditing: true,
      //   resultType: CameraResultType.DataUrl,
      //   source: CameraSource.Camera
      // });
      // this.userProfile.profileImage = image.dataUrl;
      
      await this.showToast('Camera feature will be implemented', 'primary');
    } catch (error) {
      console.error('Camera error:', error);
    }
  }

  /**
   * Choose photo from gallery
   */
  async chooseFromGallery() {
    // TODO: Implement gallery functionality using Capacitor Camera plugin
    
    try {
      // const image = await Camera.getPhoto({
      //   quality: 90,
      //   allowEditing: true,
      //   resultType: CameraResultType.DataUrl,
      //   source: CameraSource.Photos
      // });
      // this.userProfile.profileImage = image.dataUrl;
      
      await this.showToast('Gallery feature will be implemented', 'primary');
    } catch (error) {
      console.error('Gallery error:', error);
    }
  }

  /**
   * Load user profile from API
   */
  async loadUserProfile() {
    try {
      // TODO: Fetch from your service
      // const profile = await this.userService.getUserProfile();
      // this.userProfile = profile;
      // this.initializeForm();
    } catch (error) {
      console.error('Error loading profile:', error);
      await this.showToast('Failed to load profile data', 'danger');
    }
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Utility function to simulate async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Open change password modal/page
   */
  async changePassword() {
    // TODO: Navigate to change password page or open modal
    await this.showToast('Change password feature will be implemented', 'primary');
  }
}