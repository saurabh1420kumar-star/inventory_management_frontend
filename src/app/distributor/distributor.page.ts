import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  businessOutline,
  personOutline,
  callOutline,
  mailOutline,
  locationOutline,
  documentTextOutline,
  cardOutline,
  calendarOutline,
  createOutline,
  closeOutline,
  trashOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline
} from 'ionicons/icons';
import { DistributorService, DistributorDto } from '../services/distributor.service';

interface Distributor {
  id: string;
  name: string;
  assignedPerson: string;
  salespersonId?: number;
  distributorType: string;
  companyType: string;
  email: string;
  contact: string;
  alternateContact?: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status?: string;
  creditLimit?: boolean;
  username?: string;
  password?: string;
  accountNumber?: string;
  ifsc?: string;
  accountName?: string;
  createdAt: string;
}

@Component({
  selector: 'app-distributor',
  templateUrl: './distributor.page.html',
  styleUrls: ['./distributor.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  standalone: true,
})
export class DistributorPage implements OnInit {
  distributors: Distributor[] = [];
  filteredDistributors: Distributor[] = [];
  searchQuery: string = '';
  salesPersons: any[] = [];

  // Modal states
  showAddModal: boolean = false;
  showDetailsModal: boolean = false;
  showDeleteConfirmModal: boolean = false;
  isEditing: boolean = false;
  selectedDistributor: Distributor | null = null;

  distributorForm!: FormGroup;

  // Stats
  totalDistributors: number = 0;
  totalAssignedPersons: number = 0;
  totalDistributorTypes: number = 0;

  // Loading state
  isLoading: boolean = false;
  
  // Password visibility toggle
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private distributorService: DistributorService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    // Register icons
    addIcons({
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'business-outline': businessOutline,
      'person-outline': personOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'location-outline': locationOutline,
      'document-text-outline': documentTextOutline,
      'card-outline': cardOutline,
      'calendar-outline': calendarOutline,
      'create-outline': createOutline,
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
      'lock-closed-outline': lockClosedOutline,
      'eye-outline': eyeOutline,
      'eye-off-outline': eyeOffOutline
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.fetchSalesPersons();
    this.fetchDistributors();
  }

  initializeForm() {
    this.distributorForm = this.fb.group({
      name: ['', [Validators.required]],
      assignedPerson: ['', [Validators.required]],
      salespersonId: ['', [Validators.required]],
      distributorType: ['', [Validators.required]],
      companyType: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', [Validators.required, Validators.minLength(10)]],
      alternateContact: [''],
      address: ['', [Validators.required]],
      aadhaarNumber: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      panNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      gstNumber: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(15)]],
      creditLimit: [false],
      username: [''],
      password: [''],
      accountNumber: [''],
      ifsc: [''],
      accountName: ['']
    });
  }

  // Helper method to map DTO to UI model
  private mapDtoToDistributor(dto: DistributorDto): Distributor {
    return {
      id: dto.id.toString(),
      name: dto.name,
      assignedPerson: dto.assignedPerson,
      salespersonId: (dto as any).salespersonId,
      distributorType: dto.distributorType,
      companyType: dto.companyType,
      email: dto.contactEmail,
      contact: dto.phoneNumber,
      alternateContact: dto.alternateContact || '',
      address: dto.address,
      aadhaarNumber: dto.aadhaarNumber,
      panNumber: dto.panNumber,
      gstNumber: dto.gstNumber,
      accountNumber: (dto as any).accountNumber || '',
      ifsc: (dto as any).IFSC || (dto as any).ifsc || '',
      accountName: (dto as any).accountName || '',
      username: (dto as any).username || '',
      password: (dto as any).password || '',
      creditLimit: (dto as any).creditLimit || false,
      createdAt: dto.createdOn
    };
  }

  // Helper method to map form data to API payload
  private mapFormToPayload(formData: any) {
    // If assignedPerson is empty, try to get it from selected salesperson
    let assignedPerson = formData.assignedPerson;
    if (!assignedPerson && formData.salespersonId) {
      const person = this.salesPersons.find((p: any) => p.id === formData.salespersonId);
      if (person) {
        assignedPerson = (person.firstName || '') + ' ' + (person.lastName || '');
      }
    }

    const payload = {
      name: formData.name,
      assignedPerson: (assignedPerson?.trim() || '').toUpperCase(),
      salespersonId: formData.salespersonId,
      distributorType: formData.distributorType,
      companyType: formData.companyType,
      contactEmail: formData.email,
      phoneNumber: formData.contact,
      alternateContact: formData.alternateContact || '',
      address: formData.address,
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      gstNumber: formData.gstNumber,
      status: 'ACTIVE',
      creditLimit: formData.creditLimit || false,
      username: formData.username || '',
      password: formData.password || '',
      accountNumber: formData.accountNumber || '',
      ifsc: (formData.ifsc || '').toUpperCase(),
      accountName: formData.accountName || ''
    };

    console.log('Final payload after mapping:', payload);
    return payload;
  }

  // Fetch Sales Persons for dropdown
  fetchSalesPersons() {
    this.distributorService.getSalesPersons().subscribe({
      next: (response: any) => {
        console.log('Sales persons response:', response);
        
        // Handle both array and wrapped response formats
        let salesData = Array.isArray(response) ? response : (response?.data || []);
        
        if (Array.isArray(salesData)) {
          this.salesPersons = salesData;
          console.log('Sales persons loaded:', this.salesPersons);
        } else {
          console.error('Invalid sales persons response format', response);
          this.salesPersons = [];
        }
      },
      error: (err) => {
        console.error('Failed to load sales persons', err);
        this.salesPersons = [];
      }
    });
  }

  // Handle sales person selection
  onSalesPersonChange(event: any) {
    const salespersonId = event.detail.value;
    const selectedPerson = this.salesPersons.find((p: any) => p.id === salespersonId);
    
    if (selectedPerson) {
      const fullName = (selectedPerson.firstName || '') + ' ' + (selectedPerson.lastName || '');
      this.distributorForm.patchValue({
        salespersonId: salespersonId,
        assignedPerson: fullName.trim()
      });
    }
  }

  // API Method 1: Get All Distributors
  fetchDistributors() {
    this.isLoading = true;
    this.distributorService.getAllDistributors().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.distributors = response.data.map(dto => this.mapDtoToDistributor(dto));
          this.filteredDistributors = [...this.distributors];
          this.calculateStats();
        } else {
          console.error('Invalid response format', response);
          this.distributors = [];
          this.filteredDistributors = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load distributors', err);
        this.isLoading = false;
        // Keep empty arrays on error
        this.distributors = [];
        this.filteredDistributors = [];
        this.calculateStats();
      }
    });
  }

  calculateStats() {
    this.totalDistributors = this.distributors.length;
    this.totalAssignedPersons = new Set(this.distributors.map(d => d.assignedPerson)).size;
    this.totalDistributorTypes = new Set(this.distributors.map(d => d.distributorType)).size;
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value?.toLowerCase() || '';

    if (!this.searchQuery) {
      this.filteredDistributors = [...this.distributors];
      return;
    }

    this.filteredDistributors = this.distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(this.searchQuery) ||
      distributor.assignedPerson.toLowerCase().includes(this.searchQuery) ||
      distributor.contact.includes(this.searchQuery) ||
      distributor.address.toLowerCase().includes(this.searchQuery)
    );
  }

  openAddModal() {
    this.isEditing = false;
    this.distributorForm.reset();
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.distributorForm.reset();
  }

  // API Method 2: Get Distributor by ID (when opening details)
  openDetailsModal(distributor: Distributor) {
    const id = Number(distributor.id);
    this.isLoading = true;

    this.distributorService.getDistributorById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedDistributor = this.mapDtoToDistributor(response.data);
        } else {
          // Fallback to passed distributor if API fails
          this.selectedDistributor = distributor;
        }
        this.showDetailsModal = true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load distributor details', err);
        // Fallback to passed distributor
        this.selectedDistributor = distributor;
        this.showDetailsModal = true;
        this.isLoading = false;
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedDistributor = null;
    this.isEditing = false;
  }

  onEditDistributor() {
    if (this.selectedDistributor) {
      this.isEditing = true;
      // setTimeout ensures the *ngIf="isEditing" DOM (including ion-select) is fully
      // rendered before patchValue is called, otherwise selects ignore the value.
      setTimeout(() => {
        this.distributorForm.patchValue({
          name: this.selectedDistributor!.name,
          assignedPerson: this.selectedDistributor!.assignedPerson,
          salespersonId: this.selectedDistributor!.salespersonId,
          distributorType: this.selectedDistributor!.distributorType,
          companyType: this.selectedDistributor!.companyType,
          email: this.selectedDistributor!.email,
          contact: this.selectedDistributor!.contact,
          alternateContact: this.selectedDistributor!.alternateContact,
          address: this.selectedDistributor!.address,
          aadhaarNumber: this.selectedDistributor!.aadhaarNumber,
          panNumber: this.selectedDistributor!.panNumber,
          gstNumber: this.selectedDistributor!.gstNumber,
          accountNumber: this.selectedDistributor!.accountNumber,
          ifsc: this.selectedDistributor!.ifsc,
          accountName: this.selectedDistributor!.accountName,
          creditLimit: (this.selectedDistributor as any).creditLimit || false,
          username: this.selectedDistributor!.username || '',
          password: this.selectedDistributor!.password || ''
        });
        this.cdr.detectChanges();
      }, 300);
    }
  }

  // API Methods 3 & 4: Create or Update Distributor
  onSubmitForm() {
    if (this.distributorForm.invalid) {
      console.log('Form is invalid. Invalid controls:');
      Object.keys(this.distributorForm.controls).forEach(key => {
        const control = this.distributorForm.get(key);
        if (control?.invalid) {
          console.log(`${key}: ${control.errors ? JSON.stringify(control.errors) : 'unknown error'}`);
        }
        this.distributorForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.distributorForm.value;
    console.log('Form data before mapping:', formData);
    const payload = this.mapFormToPayload(formData);

    if (this.isEditing && this.selectedDistributor) {
      // UPDATE existing distributor
      const id = Number(this.selectedDistributor.id);
      this.isLoading = true;

      this.distributorService.updateDistributor(id, payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const updatedDistributor = this.mapDtoToDistributor(response.data);
            
            // Update in local array
            const index = this.distributors.findIndex(d => d.id === this.selectedDistributor!.id);
            if (index !== -1) {
              this.distributors[index] = updatedDistributor;
            }
            
            this.filteredDistributors = [...this.distributors];
            this.calculateStats();
            this.isEditing = false;
            this.closeDetailsModal();
            this.distributorForm.reset();
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to update distributor', err);
          this.isLoading = false;
          this.showToast('Failed to update distributor. Please try again.', 'danger');
        }
      });
    } else {
      // CREATE new distributor
      this.isLoading = true;
      console.log('Creating distributor with payload:', payload);

      this.distributorService.createDistributor(payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newDistributor = this.mapDtoToDistributor(response.data);
            
            // Add to local array
            this.distributors.push(newDistributor);
            this.filteredDistributors = [...this.distributors];
            this.calculateStats();
            this.closeAddModal();
            this.distributorForm.reset();
            this.showSuccessAlert('Distributor is created successfully!', 'Distributor Created');
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to create distributor', err);
          console.error('Error response:', err.error);
          console.error('Error message:', err.error?.message || err.statusText);
          this.isLoading = false;
          const errorMsg = err.error?.message || 'Failed to create distributor. Please check the form and try again.';
          this.showToast(errorMsg, 'danger');
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.distributorForm.reset();
  }

  // Show toast notification
  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  // Show success alert
  async showSuccessAlert(message: string, title: string = 'Success') {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Delete confirmation
  openDeleteConfirmModal() {
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
  }

  confirmDelete() {
    this.closeDeleteConfirmModal();
    this.deleteSelectedDistributor();
  }

  // API Method 5: Delete Distributor
  deleteSelectedDistributor() {
    if (!this.selectedDistributor) return;

    const confirmDelete = confirm(`Are you sure you want to delete ${this.selectedDistributor.name}?`);
    if (!confirmDelete) return;

    const id = Number(this.selectedDistributor.id);
    this.isLoading = true;

    this.distributorService.deleteDistributor(id).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from local array
          this.distributors = this.distributors.filter(d => d.id !== this.selectedDistributor!.id);
          this.filteredDistributors = [...this.distributors];
          this.calculateStats();
          this.closeDetailsModal();
          this.showToast('Distributor deleted successfully!', 'success');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to delete distributor', err);
        this.isLoading = false;
        this.showToast('Failed to delete distributor. Please try again.', 'danger');
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.distributorForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Valid email required';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum ${maxLength} characters allowed`;
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      assignedPerson: 'Assigned person',
      distributorType: 'Distributor type',
      companyType: 'Company type',
      email: 'Email',
      contact: 'Contact number',
      address: 'Address',
      aadhaarNumber: 'Aadhar number',
      panNumber: 'PAN number',
      gstNumber: 'GST number',
      accountNumber: 'Account number',
      ifsc: 'IFSC code',
      accountName: 'Account holder name'
    };
    return labels[fieldName] || fieldName;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
