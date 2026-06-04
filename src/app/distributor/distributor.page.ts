import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
  eyeOffOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cubeOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { DistributorService, DistributorDto, DistributorStock } from '../services/distributor.service';
import { SalesHierarchyService, RoleOption } from '../services/sales-hierarchy.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { INDIA_LOCATION_DATA, findLocationByPincode } from '../services/india-location.data';


interface Distributor {
  id: string;
  name: string;
  companyName?: string;
  assignedPerson: string;
  keyPersonName?: string;
  salesPersonRoleType?: string;
  salespersonId?: number;
  distributorType: string;
  distributorCode?: string;
  companyType: string;
  email: string;
  contact: string;
  alternateContact?: string;
  address: string;
  state?: string;
  district?: string;
  pinCode?: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status?: string;
  isActive?: boolean;
  creditLimit?: boolean;
  creditAmount?: number;
  creditBalance?: number;
  bankGuaranteeNumber?: string;
  bgExpiryDate?: string;
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
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CREDITED' = 'ALL';
  salesPersons: any[] = [];
  roles = [
    { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager' },
    { value: 'STATE_SALES_MGR', label: 'State Sales Manager' },
    { value: 'ZONAL_SALES_MGR', label: 'Zonal Sales Manager' },
    { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager' },
    { value: 'AREA_SALES_MGR', label: 'Area Sales Manager' },
    { value: 'SALES_OFFICER', label: 'Sales Officer' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  ];

  // Role options from API
  roleOptions: RoleOption[] = [];
  isLoadingRoles: boolean = false;

  // Key person dropdown
  keyPersonsList: any[] = [];
  isLoadingKeyPersons: boolean = false;

  // Location data
  readonly stateOptions = Object.keys(INDIA_LOCATION_DATA).sort();
  filteredDistricts: { district: string; pincode: string }[] = [];

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

  // Stock state
  distributorStock: DistributorStock | null = null;
  isLoadingStock: boolean = false;

  // Editing state
  editingSalesPersonRoleType: string = '';
  
  // Password visibility toggle
  showPassword: boolean = false;

  // Legal document modal
  showLegalModal: boolean = false;
  legalDocType: 'terms' | 'privacy' = 'terms';
  legalModalTitle: string = '';

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private distributorService: DistributorService,
    private salesHierarchyService: SalesHierarchyService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private toast: Toast
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
      'eye-off-outline': eyeOffOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'close-circle-outline': closeCircleOutline,
      'cube-outline': cubeOutline,
      'arrow-back-outline': arrowBackOutline
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.loadRoleOptions();
    this.fetchSalesPersons();
    this.fetchDistributors();
    this.setupFormValueChanges();
  }

  loadRoleOptions() {
    this.isLoadingRoles = true;
    this.salesHierarchyService.getRolesDropdown().subscribe({
      next: (opts) => {
        this.roleOptions = opts;
        this.isLoadingRoles = false;
      },
      error: () => {
        // fallback: keep empty, user won't see options until API recovers
        this.isLoadingRoles = false;
      }
    });
  }

  // Setup listener for assignedPerson field changes
  setupFormValueChanges() {
    this.distributorForm.get('assignedPerson')?.valueChanges.subscribe((role: string) => {
      if (role) {
        this.fetchKeyPersonsByRole(role);
      } else {
        this.keyPersonsList = [];
      }
    });

    this.distributorForm.get('state')?.valueChanges.subscribe((state: string) => {
      this.filteredDistricts = state ? (INDIA_LOCATION_DATA[state] || []) : [];
      this.distributorForm.patchValue({ district: '', pincode: '' }, { emitEvent: false });
    });

    this.distributorForm.get('district')?.valueChanges.subscribe((district: string) => {
      const found = this.filteredDistricts.find(d => d.district === district);
      if (found) {
        this.distributorForm.patchValue({ pincode: found.pincode }, { emitEvent: false });
      }
    });
  }

  onPincodeInput(event: any) {
    const pincode = (event.detail?.value ?? '').toString().replace(/\D/g, '');
    if (pincode.length === 6) {
      const result = findLocationByPincode(pincode);
      if (result) {
        this.filteredDistricts = INDIA_LOCATION_DATA[result.state] || [];
        this.distributorForm.patchValue(
          { state: result.state, district: result.district },
          { emitEvent: false }
        );
      }
    } else if (pincode.length === 0) {
      this.filteredDistricts = [];
      this.distributorForm.patchValue({ state: '', district: '' }, { emitEvent: false });
    }
  }

  // Fetch key persons from API based on selected role
  fetchKeyPersonsByRole(role: string) {
    console.log('ðŸ”„ Fetching key persons for role:', role);
    this.isLoadingKeyPersons = true;

    this.distributorService.getKeyPersonsByRole(role).subscribe({
      next: (response: any) => {
        console.log('âœ… Key persons fetched:', response);
        // Check if response is an array directly or wrapped in data property
        this.keyPersonsList = Array.isArray(response) ? response : (response?.data || []);
        this.isLoadingKeyPersons = false;
      },
      error: (err) => {
        console.error('âŒ Failed to fetch key persons', err);
        this.keyPersonsList = [];
        this.isLoadingKeyPersons = false;
      }
    });
  }

  initializeForm() {
    this.distributorForm = this.fb.group({
      companyName: ['', [Validators.required]],
      assignedPerson: ['', [Validators.required]],
      keyPerson: [''],
      distributorType: ['', [Validators.required]],
      companyType: ['', [Validators.required]],
      isActive: [true],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', [Validators.required, Validators.minLength(10)]],
      alternateContact: [''],
      address: ['', [Validators.required]],
      aadhaarNumber: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      panNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      gstNumber: ['', [Validators.minLength(15), Validators.maxLength(15)]],
      creditLimit: [false],
      username: [''],
      password: [''],
      accountNumber: [''],
      ifsc: [''],
      accountName: [''],
      keyPersonName: [''],
      bankGuaranteeNumber: [''],
      creditAmount: [''],
      bankGuaranteeExpiryDate: [''],
      state: [''],
      district: [''],
      pincode: ['']
    });
  }

  // Helper method to map DTO to UI model
  private mapDtoToDistributor(dto: DistributorDto): Distributor {
    return {
      id: dto.id.toString(),
      name: dto.name || (dto.firmName || '') || '',
      companyName: dto.companyName || dto.name || (dto.firmName || '') || '',
      assignedPerson: dto.assignedPerson || '',
      keyPersonName: dto.keyperson || dto.keyPersonName || '',
      salesPersonRoleType: dto.salesPersonRoleType || '',
      salespersonId: dto.salespersonId,
      distributorType: dto.distributorType,
      distributorCode: dto.distributorCode || '',
      companyType: dto.companyType,
      email: dto.contactEmail,
      contact: dto.phoneNumber,
      alternateContact: dto.alternateContact || '',
      address: dto.address,
      state: dto.state || '',
      district: dto.district || '',
      pinCode: dto.pinCode || '',
      aadhaarNumber: dto.aadhaarNumber,
      panNumber: dto.panNumber,
      gstNumber: dto.gstNumber,
      status: dto.status,
      isActive: dto.status === 'ACTIVE' || dto.status === undefined || dto.status === null,
      creditLimit: !!dto.creditLimit,
      creditAmount: dto.creditLimit,
      creditBalance: dto.creditBalance,
      bankGuaranteeNumber: dto.bankGuaranteeNumber || '',
      bgExpiryDate: dto.bgExpiryDate || '',
      accountNumber: dto.accountNumber || '',
      ifsc: (dto.ifsc || (dto as any).IFSC || ''),
      accountName: dto.accountName || '',
      username: dto.username || '',
      password: dto.password || '',
      createdAt: dto.createdOn
    };
  }

  // Helper method to map form data to API payload
  private mapFormToPayload(formData: any) {
    const selectedKeyPerson = this.keyPersonsList.find(person => person.id === formData.keyPerson);

    // salesPersonRoleType always comes from the role dropdown (assignedPerson field)
    const salesPersonRoleType = formData.assignedPerson || '';

    // Get the key person's actual name
    const assignedPersonName = selectedKeyPerson ? this.getPersonDisplayName(selectedKeyPerson) : '';

    const payload = {
      companyName: formData.companyName || '',
      firmName: formData.companyName || '',
      name: formData.companyName || '',
      salesPersonRoleType: salesPersonRoleType,
      salespersonId: formData.keyPerson || 0,
      assignedPerson: assignedPersonName || '',
      distributorType: formData.distributorType,
      companyType: formData.companyType,
      contactEmail: formData.email,
      phoneNumber: formData.contact,
      alternateContact: formData.alternateContact || '',
      address: formData.address,
      state: formData.state || '',
      district: formData.district || '',
      pinCode: formData.pincode || '',
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      gstNumber: formData.gstNumber,
      status: formData.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      creditLimit: formData.creditLimit || false,
      creditAmount: formData.creditAmount || 0,
      bankGuaranteeNumber: formData.bankGuaranteeNumber || '',
      bgExpiryDate: formData.bankGuaranteeExpiryDate || '',
      username: formData.username || '',
      password: formData.password || '',
      accountNumber: formData.accountNumber || '',
      ifsc: (formData.ifsc || '').toUpperCase(),
      accountName: formData.accountName || '',
      keyperson: formData.keyPersonName || ''
    };

    console.log('Final payload after mapping:', payload);
    return payload;
  }

  // Get the name of the selected key person
  getSelectedKeyPersonName(): string {
    const keyPersonId = this.distributorForm.get('keyPerson')?.value;
    if (!keyPersonId) return '';
    const keyPerson = this.keyPersonsList.find(person => person.id === keyPersonId);
    return keyPerson ? this.getPersonDisplayName(keyPerson) : '';
  }

  getDistributorKeyPersonName(distributor: Distributor | null): string {
    if (!distributor) return 'N/A';
    // Prioritize keyPersonName (the actual key person name from form/API)
    if (distributor.keyPersonName && distributor.keyPersonName.trim()) {
      return distributor.keyPersonName;
    }
    // Fallback to assignedPerson only if keyPersonName is not available
    return distributor.assignedPerson || 'N/A';
  }

  private getPersonDisplayName(person: any): string {
    if (!person) return '';
    if (typeof person === 'string') return person.trim();
    if (person.name) return String(person.name).trim();
    return `${person.firstName || ''} ${person.lastName || ''}`.trim();
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
    this.distributorForm.patchValue({ salespersonId });
  }

  // API Method 1: Get All Distributors
  fetchDistributors() {
    this.isLoading = true;
    this.distributorService.getAllDistributors().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.distributors = response.data.map(dto => this.mapDtoToDistributor(dto));
          this.applyFilters();
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

  handlePullRefresh(event: any) {
    this.fetchDistributors();
    setTimeout(() => event.target.complete(), 1500);
  }

  calculateStats() {
    this.totalDistributors = this.distributors.length;
    this.totalAssignedPersons = new Set(this.distributors.map(d => d.assignedPerson)).size;
    this.totalDistributorTypes = new Set(this.distributors.map(d => d.distributorType)).size;
  }

  onSearchChange(event: any) {
    this.searchQuery = (event.target.value || '').toLowerCase();
    this.applyFilters();
  }

  getSearchResults() {
    if (!this.searchQuery) return [];
    return this.distributors.filter(d =>
      d.name.toLowerCase().includes(this.searchQuery) ||
      d.assignedPerson.toLowerCase().includes(this.searchQuery) ||
      d.contact.includes(this.searchQuery) ||
      d.address.toLowerCase().includes(this.searchQuery)
    ).slice(0, 5);
  }

  selectSearchResult(distributor: Distributor) {
    this.searchQuery = '';
    this.openDetailsModal(distributor);
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CREDITED') {
    this.statusFilter = filter;
    this.applyFilters();
  }

  private applyFilters() {
    let result = [...this.distributors];

    if (this.statusFilter === 'CREDITED') {
      result = result.filter(d => (d.creditAmount ?? 0) > 0);
    } else if (this.statusFilter !== 'ALL') {
      result = result.filter(d => (d.status || '').toUpperCase() === this.statusFilter);
    }

    if (this.searchQuery) {
      result = result.filter(d =>
        d.name.toLowerCase().includes(this.searchQuery) ||
        d.assignedPerson.toLowerCase().includes(this.searchQuery) ||
        d.contact.includes(this.searchQuery) ||
        d.address.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredDistributors = result;
  }

  openAddModal() {
    this.haptic.medium();
    this.isEditing = false;
    this.editingSalesPersonRoleType = '';
    this.distributorForm.reset();
    this.distributorForm.patchValue({ username: '', password: '' });
    this.showAddModal = true;
  }

  closeAddModal() {
    this.haptic.light();
    this.showAddModal = false;
    this.editingSalesPersonRoleType = '';
    this.distributorForm.reset();
  }

  // API Method 2: Get Distributor by ID (when opening details)
  openDetailsModal(distributor: Distributor) {
    this.haptic.medium();
    const id = Number(distributor.id);
    this.isLoading = true;
    this.distributorStock = null;
    this.isLoadingStock = true;

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

    this.distributorService.getDistributorStock(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.distributorStock = response.data;
        }
        this.isLoadingStock = false;
      },
      error: () => {
        this.isLoadingStock = false;
      }
    });
  }

  closeDetailsModal() {
    this.haptic.light();
    this.showDetailsModal = false;
    this.selectedDistributor = null;
    this.distributorStock = null;
    this.isEditing = false;
    this.editingSalesPersonRoleType = '';
  }

  onEditDistributor() {
    this.haptic.medium();
    if (this.selectedDistributor) {
      this.isEditing = true;
      // editingSalesPersonRoleType kept for reference but no longer used in payload
      this.editingSalesPersonRoleType = this.selectedDistributor.salesPersonRoleType || '';

      // setTimeout ensures the *ngIf="isEditing" DOM (including ion-select) is fully
      // rendered before patchValue is called, otherwise selects ignore the value.
      setTimeout(() => {
        const dist = this.selectedDistributor!;

        // Pre-populate filteredDistricts from state so district dropdown is ready
        if (dist.state) {
          this.filteredDistricts = INDIA_LOCATION_DATA[dist.state] || [];
        }

        // Patch all form fields (assignedPerson = role dropdown value)
        this.distributorForm.patchValue({
          companyName: dist.companyName || dist.name || '',
          assignedPerson: dist.salesPersonRoleType || '',
          keyPersonName: dist.keyPersonName || dist.assignedPerson || '',
          distributorType: dist.distributorType,
          companyType: dist.companyType,
          email: dist.email,
          contact: dist.contact,
          alternateContact: dist.alternateContact || '',
          address: dist.address,
          aadhaarNumber: dist.aadhaarNumber,
          panNumber: dist.panNumber,
          gstNumber: dist.gstNumber,
          accountNumber: dist.accountNumber || '',
          ifsc: dist.ifsc || '',
          accountName: dist.accountName || '',
          creditLimit: dist.creditLimit || false,
          creditAmount: dist.creditAmount || '',
          bankGuaranteeNumber: dist.bankGuaranteeNumber || '',
          bankGuaranteeExpiryDate: dist.bgExpiryDate || '',
          username: dist.username || '',
          password: dist.password || '',
          pincode: dist.pinCode || '',
          isActive: dist.status === 'ACTIVE' || !dist.status
        });

        // Set state silently to avoid valueChanges resetting district/pincode
        this.distributorForm.get('state')?.setValue(dist.state || '', { emitEvent: false });
        // Set district silently
        this.distributorForm.get('district')?.setValue(dist.district || '', { emitEvent: false });

        // After key persons are loaded, find and set matching one by salespersonId (then by name)
        const checkAndSetKeyPerson = () => {
          if (this.keyPersonsList && this.keyPersonsList.length > 0) {
            const matchById = dist.salespersonId
              ? this.keyPersonsList.find(p => p.id === dist.salespersonId)
              : null;
            const matchByName = this.keyPersonsList.find(p =>
              (p.firstName + ' ' + p.lastName).trim() === (dist.assignedPerson || '')
            );
            const match = matchById || matchByName;
            if (match) {
              this.distributorForm.patchValue({ keyPerson: match.id });
            }
          } else {
            setTimeout(checkAndSetKeyPerson, 500);
          }
        };

        // Start checking after a short delay to allow key persons to load
        setTimeout(checkAndSetKeyPerson, 1000);

        this.cdr.detectChanges();
      }, 300);
    }
  }

  // API Methods 3 & 4: Create or Update Distributor
  onSubmitForm() {
    this.haptic.medium();
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
          const errorMessage = this.extractErrorMessage(err);
          console.error('Failed to update distributor', err);
          this.isLoading = false;
          this.toast.present(errorMessage, 'danger');
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
            this.toast.present('Distributor created successfully!', 'success');
          }
          this.isLoading = false;
        },
        error: (err) => {
          const errorMessage = this.extractErrorMessage(err);
          console.error('Failed to create distributor', err);
          this.isLoading = false;
          this.toast.present(errorMessage, 'danger');
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.distributorForm.reset();
  }

  // Helper method to extract error message from API response
  private extractErrorMessage(error: any): string {
    if (!error) return 'An error occurred. Please try again.';
    
    if (error.error?.error) return error.error.error;
    if (error.error?.message) return error.error.message;
    
    if (error.error && typeof error.error === 'object' && !Array.isArray(error.error)) {
      const errorEntries = Object.entries(error.error);
      if (errorEntries.length > 0) {
        const errorMessages = errorEntries
          .map(([field, message]) => message as string)
          .filter(msg => msg && typeof msg === 'string');
        
        if (errorMessages.length > 0) return errorMessages.join('\n');
      }
    }
    
    if (error.statusText) return error.statusText;
    return 'Failed to process distributor. Please try again.';
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
    this.haptic.heavy();
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    this.haptic.light();
    this.showDeleteConfirmModal = false;
  }

  confirmDelete() {
    this.haptic.heavy();
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
          this.toast.present('Distributor deleted successfully!', 'success');
        }
        this.isLoading = false;
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error('Failed to delete distributor', err);
        this.isLoading = false;
        this.toast.present(errorMessage, 'danger');
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
      firmName: 'Firm name',
      lastName: 'Last name',
      assignedPerson: 'Assigned person',
      salespersonId: 'Sales person',
      keyPerson: 'Key person',
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

  openLegalDoc(type: 'terms' | 'privacy', title: string): void {
    this.haptic.light();
    this.legalDocType = type;
    this.legalModalTitle = title;
    this.showLegalModal = true;
  }

  closeLegalDoc(): void {
    this.showLegalModal = false;
  }
}
