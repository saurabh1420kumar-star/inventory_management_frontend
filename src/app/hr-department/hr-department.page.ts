import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';
import { UserService, UpdateUserRequest } from '../services/user.service';
import { Auth, CreateUserRequest } from '../services/auth';
import { HapticService } from '../services/haptic.service';
import { Toast } from '../services/toast';
import { AclDirective } from '../acl/acl.directive';
import { DesignationService, Designation } from '../services/designation.service';
import { environment } from '../../environments/environment';

interface Employee {
  id: number | string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  status: 'Pending' | 'Active' | 'Rejected';
  avatar?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  employeeRollNo?: string;
  roleType?: string;
  contactNo?: string | null;
  alternateContact?: string | null;
  city?: string | null;
  country?: string | null;
  zip?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  completeAddress?: string | null;
  createdOn?: string;
  password?: string | null;
}

type EmployeeStatus = 'All' | 'Pending' | 'Active' | 'Rejected';
type ModalType = 'add' | 'edit' | 'view' | 'delete' | 'reject' | null;

interface RoleType {
  value: string;
  label: string;
}

@Component({
  selector: 'app-hr-department',
  templateUrl: './hr-department.page.html',
  styleUrls: ['./hr-department.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    AclDirective
  ],
  standalone: true,
})
export class HrDepartmentPage implements OnInit {
  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'HR';
  Math = Math;
  employees: Employee[] = [];
  users: User[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  statusFilter: EmployeeStatus = 'All';
  showStatusDropdown = false;
  currentPage = 1;
  itemsPerPage = 6;
  activeModal: ModalType = null;
  selectedEmployee: Employee | null = null;
  employeeForm: FormGroup;
  showEditPassword = false;
  pendingHRApprovalsCount = 0;
  pendingHRApprovals: any[] = [];

  // Available Role Types
  roleTypes: RoleType[] = [
    // { value: 'SUPER_ADMIN', label: 'Super Admin' },
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
    { value: 'PLANT_EXECUTIVE', label: 'Plant Executive' }
  ];

  // Available Blood Groups
  bloodGroups: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Available Gender Options
  genderOptions: { value: string; label: string }[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' }
  ];

  // Available Status Options for Edit
  statusOptions: { value: string; label: string }[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  selectedPeriod: 'week' | 'month' | 'year' = 'month';

  get periods(): { key: 'week' | 'month' | 'year'; label: string }[] {
    return [
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' }
    ];
  }

  selectPeriod(p: 'week' | 'month' | 'year') {
    this.selectedPeriod = p;
  }

  private haptic = inject(HapticService);
  private toast = inject(Toast);
  private designationService = inject(DesignationService);
  private http = inject(HttpClient);

  // ── Create Designation modal state ──────────────────────────────────────────
  showDesignationModal = false;
  designations: Designation[] = [];
  isLoadingDesignations = false;
  isSavingDesignation = false;
  designationSearch = '';
  selectedRoleCategory: 'USER' | 'SALES' = 'USER';

  // Approval modal state
  showApprovalModal = false;
  isProcessingApproval = false;
  selectedApprovalRequest: any = null;
  approvalAction: 'APPROVE' | 'REJECT' | null = null;
  approvalComments = '';

  // Edit pending approval modal state
  showEditPendingModal = false;
  selectedPendingForEdit: any = null;
  isEditingPending = false;
  editPendingForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private auth: Auth,
    private elementRef: ElementRef
  ) {
    this.employeeForm = this.formBuilder.group({
      id: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
      employeeRollNo: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      alternateContact: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      city: ['', Validators.required],
      zip: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      country: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      bloodGroup: [''],
      roleType: ['', Validators.required],
      completeAddress: ['', [Validators.required, Validators.minLength(10)]],
      password: [''],
      status: [''],
      // Keep old fields for backward compatibility
      name: [''],
      position: [''],
      department: [''],
      phone: [''],
      avatar: ['']
    });

    this.editPendingForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      contactNo: ['', Validators.required],
      alternateContactNo: [''],
      bloodGroup: [''],
      completeAddress: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', Validators.required],
      country: ['', Validators.required],
      zip: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      employeeRollNo: ['', Validators.required],
      zone: [''],
      region: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadPendingHRApprovals();
  }

  get isAdmin(): boolean {
    const role = this.auth.getRoleType();
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  }

  /** Close status dropdown when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showStatusDropdown) {
      const dropdownEl = this.elementRef.nativeElement.querySelector('.status-dropdown-wrap');
      if (dropdownEl && !dropdownEl.contains(event.target as HTMLElement)) {
        this.showStatusDropdown = false;
      }
    }
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.employees = data.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          position: user.username,
          department: this.formatRoleType(user.roleType),
          email: user.email,
          phone: user.contactNo || 'N/A',
          status: this.mapUserStatus(user.status),
          avatar: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          employeeRollNo: (user as any).employeeRollNo || (user as any).employeeCode || '',
          roleType: user.roleType,
          contactNo: user.contactNo,
          alternateContact: user.alternateContactNo,
          city: user.city,
          country: user.country,
          zip: user.zip,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          bloodGroup: user.bloodGroup,
          completeAddress: user.completeAddress,
          createdOn: user.createdOn,
          password: user.password || null
        }));
        this.isLoading = false;
      },
      error: (error) => {
        const errorMessage = this.extractErrorMessage(error);
        this.errorMessage = errorMessage;
        this.isLoading = false;
        console.error('Error loading users:', error);
        
        // Show error in toast
        this.toast.present(errorMessage, 'danger');
      }
    });
  }

  loadPendingHRApprovals() {
    const token = this.auth.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any[]>(`${environment.apiUrl}/hrmaster/pending-approvals`, { headers })
      .subscribe({
        next: (data: any[]) => {
          if (Array.isArray(data)) {
            this.pendingHRApprovals = data.map(approval => ({
              ...approval.user,
              id: approval.id,
              approvalStatus: approval.approvalStatus,
              requestedOn: approval.requestedOn,
              reviewComments: approval.reviewComments,
              reviewedBy: approval.reviewedBy,
              reviewedOn: approval.reviewedOn
            }));
          } else {
            this.pendingHRApprovals = [];
          }
          this.pendingHRApprovalsCount = this.pendingHRApprovals.length;
        },
        error: (err) => {
          console.error('Failed to load pending HR approvals:', err);
          this.pendingHRApprovals = [];
          this.pendingHRApprovalsCount = 0;
        },
      });
  }

  openApprovalModal(approval: any, action: 'APPROVE' | 'REJECT') {
    this.selectedApprovalRequest = approval;
    this.approvalAction = action;
    this.approvalComments = '';
    this.showApprovalModal = true;
  }

  closeApprovalModal() {
    this.showApprovalModal = false;
    this.selectedApprovalRequest = null;
    this.approvalAction = null;
    this.approvalComments = '';
  }

  openEditPendingModal(approval: any) {
    this.selectedPendingForEdit = approval;

    const normalizeGender = (g: string) => {
      if (!g) return '';
      const upper = g.toUpperCase();
      if (upper === 'M' || upper === 'MALE') return 'MALE';
      if (upper === 'F' || upper === 'FEMALE') return 'FEMALE';
      if (upper === 'O' || upper === 'OTHER') return 'OTHER';
      return upper;
    };

    this.editPendingForm.patchValue({
      firstName: approval.firstName,
      lastName: approval.lastName,
      email: approval.email,
      contactNo: approval.contactNo,
      alternateContactNo: approval.alternateContactNo,
      bloodGroup: approval.bloodGroup,
      completeAddress: approval.completeAddress,
      city: approval.city,
      country: approval.country,
      zip: approval.zip,
      dateOfBirth: approval.dateOfBirth,
      gender: normalizeGender(approval.gender),
      employeeRollNo: approval.employeeRollNo,
      zone: approval.zone,
      region: approval.region
    });
    this.showEditPendingModal = true;
  }

  closeEditPendingModal() {
    this.showEditPendingModal = false;
    this.selectedPendingForEdit = null;
    this.editPendingForm.reset();
  }

  savePendingChanges() {
    if (!this.selectedPendingForEdit || this.editPendingForm.invalid) {
      this.toast.present('Please fill all required fields', 'warning');
      return;
    }

    this.isEditingPending = true;
    const token = this.auth.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const payload = this.editPendingForm.value;

    this.http.patch(`${environment.apiUrl}/hrmaster/edit-pending/${this.selectedPendingForEdit.id}`, payload, { headers, responseType: 'text' })
      .subscribe({
        next: (response: any) => {
          this.isEditingPending = false;
          let message = '';

          if (typeof response === 'string' && response.trim()) {
            message = response.trim();
          } else if (response?.message) {
            message = response.message;
          } else {
            message = `${this.selectedPendingForEdit.firstName}'s profile updated successfully`;
          }

          this.toast.present(message, 'success');
          this.closeEditPendingModal();
          this.loadPendingHRApprovals();
        },
        error: (err) => {
          this.isEditingPending = false;
          let errorMsg = 'Failed to update profile';

          if (typeof err?.error === 'string') {
            errorMsg = err.error;
          } else if (err?.error?.message) {
            errorMsg = err.error.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }

          this.toast.present(errorMsg, 'danger');
        },
      });
  }

  processApproval() {
    if (!this.selectedApprovalRequest || !this.approvalAction) return;

    this.isProcessingApproval = true;
    const token = this.auth.getToken();
    const username = this.auth.getUsername() || '1';

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    headers = headers.set('HrMaster-Username', username);

    const payload = {
      pendingRequestId: this.selectedApprovalRequest.id,
      action: this.approvalAction,
      comments: this.approvalComments.trim()
    };

    this.http.post(`${environment.apiUrl}/hrmaster/process-approval`, payload, { headers, responseType: 'text' })
      .subscribe({
        next: (response: any) => {
          this.isProcessingApproval = false;
          let message = '';

          // Handle different response formats
          if (typeof response === 'string' && response.trim()) {
            message = response.trim();
          } else if (response?.message) {
            message = response.message;
          } else {
            message = this.approvalAction === 'APPROVE'
              ? `${this.selectedApprovalRequest.firstName} approved successfully`
              : `${this.selectedApprovalRequest.firstName} rejected`;
          }

          this.toast.present(message, 'success');
          this.closeApprovalModal();
          this.loadPendingHRApprovals();
        },
        error: (err) => {
          this.isProcessingApproval = false;
          let errorMsg = 'Failed to process approval';

          if (typeof err?.error === 'string') {
            errorMsg = err.error;
          } else if (err?.error?.message) {
            errorMsg = err.error.message;
          } else if (err?.message) {
            errorMsg = err.message;
          }

          this.toast.present(errorMsg, 'danger');
        },
      });
  }

  handlePullRefresh(event: any) {
    this.loadUsers();
    setTimeout(() => event.target.complete(), 1500);
  }

  formatRoleType(roleType: string): string {
    const role = this.roleTypes.find(r => r.value === roleType);
    return role ? role.label : roleType.replace(/_/g, ' ');
  }

  // ── Create Designation modal ─────────────────────────────────────────────────
  openDesignationModal(): void {
    this.showDesignationModal = true;
    this.designationSearch = '';
    this.selectedRoleCategory = 'USER';
    this.loadDesignations();
  }

  closeDesignationModal(): void {
    this.showDesignationModal = false;
    this.designationSearch = '';
    this.selectedRoleCategory = 'USER';
  }

  private loadDesignations(): void {
    this.isLoadingDesignations = true;
    this.designationService.getDesignations().subscribe({
      next: (list) => {
        this.designations = list;
        this.isLoadingDesignations = false;
      },
      error: () => {
        this.isLoadingDesignations = false;
      }
    });
  }

  /** Designations filtered by the search box. */
  get filteredDesignations(): Designation[] {
    const term = this.designationSearch.trim().toLowerCase();
    if (!term) return this.designations;
    return this.designations.filter(d => d.label.toLowerCase().includes(term));
  }

  /** True when the typed text does not match an existing designation → offer to create it. */
  get canCreateDesignation(): boolean {
    const term = this.designationSearch.trim();
    return term.length > 0 && !this.designationService.exists(term);
  }

  createDesignationFromSearch(): void {
    const label = this.designationSearch.trim();
    if (!label || this.isSavingDesignation) return;

    this.isSavingDesignation = true;
    this.designationService.addDesignation(label, this.selectedRoleCategory).subscribe({
      next: () => {
        this.isSavingDesignation = false;
        this.designationSearch = '';
        this.selectedRoleCategory = 'USER';
        this.loadDesignations();
        this.toast.present(`Designation "${label}" created`, 'success');
      },
      error: () => {
        this.isSavingDesignation = false;
        this.toast.present('Could not create designation. Please try again.', 'danger');
      }
    });
  }

  private mapUserStatus(apiStatus: string): 'Pending' | 'Active' | 'Rejected' {
    switch (apiStatus?.toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
      case 'INACTIVE':
      case 'SUSPENDED':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  // Helper method to extract error message from API response
  private extractErrorMessage(error: any): string {
    if (!error) return 'An error occurred. Please try again.';
    
    // Check for error.error.error format
    if (error.error?.error) {
      return error.error.error;
    }
    
    // Check for error.error.message format
    if (error.error?.message) {
      return error.error.message;
    }
    
    // Check for validation error objects (field-level errors)
    if (error.error && typeof error.error === 'object' && !Array.isArray(error.error)) {
      const errorEntries = Object.entries(error.error);
      if (errorEntries.length > 0) {
        // Get all error messages and join them
        const errorMessages = errorEntries
          .map(([field, message]) => message as string)
          .filter(msg => msg && typeof msg === 'string');
        
        if (errorMessages.length > 0) {
          return errorMessages.join('\n');
        }
      }
    }
    
    // Check for error.statusText format
    if (error.statusText) {
      return error.statusText;
    }
    
    // Default fallback
    return 'Failed to create employee. Please try again.';
  }


  getStatusOptions(): EmployeeStatus[] {
    return ['All', 'Pending', 'Active', 'Rejected'];
  }

  // ✅ ADDED: Method to get count of employees by status
  getStatusCount(status: string): number {
    return this.employees.filter(e => e.status === status).length;
  }

  get filteredEmployees(): Employee[] {
    return this.employees.filter(employee => {
      const matchesSearch =
        employee.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        employee.department.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus =
        this.statusFilter === 'All' || employee.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get paginatedEmployees(): Employee[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEmployees.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showPagination(): boolean {
    return this.filteredEmployees.length > this.itemsPerPage;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  resetPagination() {
    this.currentPage = 1;
  }

  openAddModal() {
    this.haptic.medium();
    this.activeModal = 'add';
    this.employeeForm.reset({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      contact: '',
      alternateContact: '',
      city: '',
      zip: '',
      country: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      roleType: '',
      completeAddress: '',
      password: '',
      status: 'Pending'
    });
    // Make password required for add
    this.employeeForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.employeeForm.get('password')?.updateValueAndValidity();
  }

  // ✅ UPDATED - Now populates all fields like Add Employee modal
  openEditModal(employee: Employee) {
    this.haptic.medium();
    this.activeModal = 'edit';
    this.selectedEmployee = employee;
    
    // Map status back to API format
    let apiStatus = 'PENDING';
    switch(employee.status) {
      case 'Active':
        apiStatus = 'ACTIVE';
        break;
      case 'Pending':
        apiStatus = 'PENDING';
        break;
      case 'Rejected':
        apiStatus = 'REJECTED';
        break;
    }

    this.employeeForm.patchValue({
      id: employee.id,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      employeeRollNo: employee.employeeRollNo || '',
      username: employee.username || '',
      email: employee.email || '',
      contact: employee.contactNo || '',
      alternateContact: employee.alternateContact || '',
      city: employee.city || '',
      zip: employee.zip || '',
      country: employee.country || '',
      dateOfBirth: employee.dateOfBirth || '',
      gender: (employee.gender || '').toUpperCase(),
      bloodGroup: employee.bloodGroup || '',
      roleType: employee.roleType || '',
      completeAddress: employee.completeAddress || '',
      status: apiStatus,
      password: employee.password || ''
    });
    this.showEditPassword = false;

    // Make password optional for edit
    this.employeeForm.get('password')?.clearValidators();
    this.employeeForm.get('password')?.updateValueAndValidity();
  }

  openViewModal(employee: Employee) {
    this.haptic.light();
    this.activeModal = 'view';
    this.selectedEmployee = employee;
  }

  openDeleteModal(employee: Employee) {
    this.haptic.heavy();
    this.activeModal = 'delete';
    this.selectedEmployee = employee;
  }

  openRejectModal(employee: Employee) {
    this.haptic.heavy();
    this.activeModal = 'reject';
    this.selectedEmployee = employee;
  }

  closeModal() {
    this.haptic.light();
    this.activeModal = null;
    this.selectedEmployee = null;
    this.employeeForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
  }

  onAddEmployee() {
    this.haptic.medium();
    if (this.employeeForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.employeeForm.value;
      const payload: CreateUserRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        username: formValue.username,
        employeeRollNo: formValue.employeeRollNo,
        email: formValue.email,
        password: formValue.password,
        contactNo: formValue.contact,
        alternateContactNo: formValue.alternateContact || undefined,
        city: formValue.city,
        country: formValue.country,
        zip: formValue.zip,
        roleType: formValue.roleType,
        dateOfBirth: formValue.dateOfBirth,
        gender: formValue.gender,
        bloodGroup: formValue.bloodGroup || undefined,
        completeAddress: formValue.completeAddress,
        status: 'PENDING'
      };

      console.log('Payload being sent:', payload);

      this.auth.createUser(payload).subscribe({
        next: (response) => {
          this.successMessage = 'Employee created successfully!';
          
          const newEmployee: Employee = {
            id: response.id,
            name: `${response.firstName} ${response.lastName}`,
            position: response.username,
            department: this.formatRoleType(response.roleType),
            email: response.email,
            phone: formValue.contact || 'N/A',
            status: 'Pending',
            avatar: `https://ui-avatars.com/api/?name=${response.firstName}+${response.lastName}&background=random`,
            firstName: response.firstName,
            lastName: response.lastName,
            username: response.username,
            employeeRollNo: formValue.employeeRollNo || '',
            roleType: response.roleType,
            contactNo: formValue.contact,
            alternateContact: formValue.alternateContact,
            city: formValue.city,
            country: formValue.country,
            zip: formValue.zip,
            dateOfBirth: formValue.dateOfBirth,
            gender: formValue.gender,
            bloodGroup: formValue.bloodGroup,
            completeAddress: formValue.completeAddress,
            createdOn: response.createdOn
          };

          this.employees = [newEmployee, ...this.employees];
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeModal();
            this.resetPagination();
          }, 1500);
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorMessage = errorMessage;
          this.isLoading = false;
          console.error('Error creating user:', error);
          
          // Show error in toast
          this.toast.present(errorMessage, 'danger');
        }
      });
    } else {
      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.markAsTouched();
      });
    }
  }

  // ✅ UPDATED - Now calls API to update user
  onUpdateEmployee() {
    this.haptic.medium();
    if (this.employeeForm.valid && this.selectedEmployee) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.employeeForm.value;
      const userId = Number(this.selectedEmployee.id);

      const payload: UpdateUserRequest = {
        username: formValue.username,
        email: formValue.email,
        status: formValue.status,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        employeeRollNo: formValue.employeeRollNo || undefined,
        contactNo: formValue.contact,
        alternateContactNo: formValue.alternateContact || undefined,
        bloodGroup: formValue.bloodGroup || undefined,
        completeAddress: formValue.completeAddress,
        city: formValue.city,
        dateOfBirth: formValue.dateOfBirth,
        gender: formValue.gender,
        country: formValue.country,
        zip: formValue.zip,
        roleType: formValue.roleType
      };

      // Only include password if admin changed it from the original
      const originalPassword = this.selectedEmployee.password || '';
      if (this.isAdmin && formValue.password && formValue.password !== originalPassword) {
        payload.password = formValue.password;
      }

      console.log('Update payload:', payload);

      this.userService.updateUser(userId, payload).subscribe({
        next: (response) => {
          this.successMessage = 'Employee updated successfully!';
          
          // Update the selected employee with the response data
          if (response) {
            this.selectedEmployee = {
              id: response.id ?? this.selectedEmployee?.id ?? userId,
              name: `${response.firstName} ${response.lastName}`,
              position: response.username,
              department: this.formatRoleType(response.roleType),
              email: response.email,
              phone: response.contactNo || 'N/A',
              status: this.mapUserStatus(response.status),
              avatar: `https://ui-avatars.com/api/?name=${response.firstName}+${response.lastName}&background=random`,
              firstName: response.firstName,
              lastName: response.lastName,
              username: response.username,
              employeeRollNo: (response as any).employeeRollNo || '',
              roleType: response.roleType,
              contactNo: response.contactNo,
              alternateContact: (response as any).alternateContactNo,
              city: response.city,
              country: response.country,
              zip: response.zip,
              dateOfBirth: response.dateOfBirth,
              gender: response.gender,
              bloodGroup: response.bloodGroup,
              completeAddress: response.completeAddress,
              createdOn: (response as any).createdOn
            };
          }
          
          // Reload users to get fresh data
          this.loadUsers();
          this.isLoading = false;

          setTimeout(() => {
            this.closeModal();
          }, 1500);
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorMessage = errorMessage;
          this.isLoading = false;
          console.error('Error updating user:', error);
          
          // Show error in toast
          this.toast.present(errorMessage, 'danger');
        }
      });
    } else {
      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.markAsTouched();
      });
    }
  }

  onDeleteEmployee() {
    if (this.selectedEmployee) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userId = Number(this.selectedEmployee.id);
      console.log('Deleting user:', userId);

      this.userService.deleteUser(userId).subscribe({
        next: (response) => {
          console.log('User deleted successfully:', response);
          
          this.successMessage = 'Employee deleted successfully!';
          this.employees = this.employees.filter(emp => emp.id !== this.selectedEmployee!.id);
          this.isLoading = false;

          if (this.paginatedEmployees.length === 0 && this.currentPage > 1) {
            this.currentPage--;
          }

          setTimeout(() => {
            this.closeModal();
          }, 1500);
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorMessage = errorMessage;
          this.isLoading = false;
          console.error('Error deleting user:', error);
          
          // Show error in toast
          this.toast.present(errorMessage, 'danger');
        }
      });
    }
  }

  onApproveEmployee() {
    if (this.selectedEmployee) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userId = Number(this.selectedEmployee.id);
      const roleType = this.selectedEmployee.roleType || 'EMPLOYEE';

      console.log('Approving user:', { userId, roleType });

      this.userService.assignRoleToUser(userId, roleType).subscribe({
        next: (response) => {
          console.log('Role assigned successfully:', response);
          
          this.successMessage = 'Employee approved successfully!';
          this.loadUsers();
          this.isLoading = false;

          setTimeout(() => {
            this.closeModal();
          }, 1500);
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorMessage = errorMessage;
          this.isLoading = false;
          console.error('Error approving employee:', error);
          
          // Show error in toast
          this.toast.present(errorMessage, 'danger');
        }
      });
    }
  }

  onRejectEmployee() {
    if (this.selectedEmployee) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userId = Number(this.selectedEmployee.id);

      console.log('Rejecting/Suspending user:', userId);

      this.userService.rejectUser(userId).subscribe({
        next: (response) => {
          console.log('User rejected successfully:', response);
          
          this.successMessage = 'Employee rejected successfully!';
          // Update local employee status
          this.employees = this.employees.map(emp =>
            emp.id === this.selectedEmployee!.id ? { ...emp, status: 'Rejected' as const } : emp
          );
          this.isLoading = false;

          setTimeout(() => {
            this.closeModal();
          }, 1500);
        },
        error: (error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorMessage = errorMessage;
          this.isLoading = false;
          console.error('Error rejecting employee:', error);
          
          // Show error in toast
          this.toast.present(errorMessage, 'danger');
        }
      });
    }
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value || '';
    this.resetPagination();
  }

  onStatusFilterChange(status: EmployeeStatus) {
    this.statusFilter = status;
    this.showStatusDropdown = false;
    this.resetPagination();
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'Pending': 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-400',
      'Active': 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-400',
      'Rejected': 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-400'
    };
    return statusClasses[status as Employee['status']] || '';
  }

  getStatusFilterClass(status: EmployeeStatus): string {
    const statusClasses: Record<EmployeeStatus, string> = {
      'All': 'text-gray-700',
      'Pending': 'text-yellow-700',
      'Active': 'text-green-700',
      'Rejected': 'text-red-700'
    };
    return statusClasses[status];
  }
}
