import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
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
  trashOutline
} from 'ionicons/icons';
import { DistributorService, DistributorDto } from '../services/distributor.service';

interface Distributor {
  id: string;
  name: string;
  assignedPerson: string;
  distributorType: string;
  companyType: string;
  email: string;
  contact: string;
  alternateContact?: string;
  address: string;
  aadharNo: string;
  panNo: string;
  gstNo: string;
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

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private distributorService: DistributorService
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
      'trash-outline': trashOutline
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
      distributorType: ['', [Validators.required]],
      companyType: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', [Validators.required, Validators.minLength(10)]],
      alternateContact: [''],
      address: ['', [Validators.required]],
      aadharNo: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      panNo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      gstNo: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(15)]]
    });
  }

  // Helper method to map DTO to UI model
  private mapDtoToDistributor(dto: DistributorDto): Distributor {
    return {
      id: dto.id.toString(),
      name: dto.name,
      assignedPerson: dto.assignedPerson,
      distributorType: dto.distributorType,
      companyType: dto.companyType,
      email: dto.contactEmail,
      contact: dto.phoneNumber,
      alternateContact: dto.alternateContact || '',
      address: dto.address,
      aadharNo: dto.aadhaarNumber,
      panNo: dto.panNumber,
      gstNo: dto.gstNumber,
      createdAt: dto.createdOn
    };
  }

  // Helper method to map form data to API payload
  private mapFormToPayload(formData: any) {
    return {
      name: formData.name,
      assignedPerson: formData.assignedPerson,
      distributorType: formData.distributorType,
      companyType: formData.companyType,
      contactEmail: formData.email,
      phoneNumber: formData.contact,
      alternateContact: formData.alternateContact || '',
      address: formData.address,
      aadhaarNumber: formData.aadharNo,
      panNumber: formData.panNo,
      gstNumber: formData.gstNo,
      status: 'ACTIVE'
    };
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
      this.distributorForm.patchValue({
        name: this.selectedDistributor.name,
        assignedPerson: this.selectedDistributor.assignedPerson,
        distributorType: this.selectedDistributor.distributorType,
        companyType: this.selectedDistributor.companyType,
        email: this.selectedDistributor.email,
        contact: this.selectedDistributor.contact,
        alternateContact: this.selectedDistributor.alternateContact,
        address: this.selectedDistributor.address,
        aadharNo: this.selectedDistributor.aadharNo,
        panNo: this.selectedDistributor.panNo,
        gstNo: this.selectedDistributor.gstNo
      });
    }
  }

  // API Methods 3 & 4: Create or Update Distributor
  onSubmitForm() {
    if (this.distributorForm.invalid) {
      Object.keys(this.distributorForm.controls).forEach(key => {
        this.distributorForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.distributorForm.value;
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
          alert('Failed to update distributor. Please try again.');
        }
      });
    } else {
      // CREATE new distributor
      this.isLoading = true;

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
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to create distributor', err);
          this.isLoading = false;
          alert('Failed to create distributor. Please try again.');
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.distributorForm.reset();
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
          alert('Distributor deleted successfully!');
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to delete distributor', err);
        this.isLoading = false;
        alert('Failed to delete distributor. Please try again.');
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
      aadharNo: 'Aadhar number',
      panNo: 'PAN number',
      gstNo: 'GST number'
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
