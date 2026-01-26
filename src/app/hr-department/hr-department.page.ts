import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { User } from '../models/user.model';
import { UserService, UpdateUserRequest } from '../services/user.service';
import { Auth, CreateUserRequest } from '../services/auth';

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
    ReactiveFormsModule
  ],
  standalone: true,
})
export class HrDepartmentPage implements OnInit {
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

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private auth: Auth
  ) {
    this.employeeForm = this.formBuilder.group({
      id: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
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
  }

  ngOnInit() {
    this.loadUsers();
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
          createdOn: user.createdOn
        }));
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load users';
        this.isLoading = false;
        console.error('Error loading users:', error);
      }
    });
  }

  formatRoleType(roleType: string): string {
    const role = this.roleTypes.find(r => r.value === roleType);
    return role ? role.label : roleType.replace(/_/g, ' ');
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
      username: employee.username || '',
      email: employee.email || '',
      contact: employee.contactNo || '',
      alternateContact: employee.alternateContact || '',
      city: employee.city || '',
      zip: employee.zip || '',
      country: employee.country || '',
      dateOfBirth: employee.dateOfBirth || '',
      gender: employee.gender || '',
      bloodGroup: employee.bloodGroup || '',
      roleType: employee.roleType || '',
      completeAddress: employee.completeAddress || '',
      status: apiStatus
    });

    // Make password optional for edit
    this.employeeForm.get('password')?.clearValidators();
    this.employeeForm.get('password')?.updateValueAndValidity();
  }

  openViewModal(employee: Employee) {
    this.activeModal = 'view';
    this.selectedEmployee = employee;
  }

  openDeleteModal(employee: Employee) {
    this.activeModal = 'delete';
    this.selectedEmployee = employee;
  }

  openRejectModal(employee: Employee) {
    this.activeModal = 'reject';
    this.selectedEmployee = employee;
  }

  closeModal() {
    this.activeModal = null;
    this.selectedEmployee = null;
    this.employeeForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
  }

  onAddEmployee() {
    if (this.employeeForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.employeeForm.value;
      const payload: CreateUserRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        username: formValue.username,
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
          this.errorMessage = error.error?.message || 'Failed to create employee. Please try again.';
          this.isLoading = false;
          console.error('Error creating user:', error);
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

      console.log('Update payload:', payload);

      this.userService.updateUser(userId, payload).subscribe({
        next: (response) => {
          this.successMessage = 'Employee updated successfully!';
          
          // Reload users to get fresh data
          this.loadUsers();
          this.isLoading = false;

          setTimeout(() => {
            this.closeModal();
          }, 1500);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to update employee. Please try again.';
          this.isLoading = false;
          console.error('Error updating user:', error);
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
          this.errorMessage = error.message || 'Failed to delete employee. Please try again.';
          this.isLoading = false;
          console.error('Error deleting user:', error);
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
          this.errorMessage = error.message || 'Failed to approve employee. Please try again.';
          this.isLoading = false;
          console.error('Error approving employee:', error);
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
          this.errorMessage = error.message || 'Failed to reject employee. Please try again.';
          this.isLoading = false;
          console.error('Error rejecting employee:', error);
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
