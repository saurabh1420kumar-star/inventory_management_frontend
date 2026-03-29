import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SalesHierarchyService, SalesPerson, HierarchyRole, HIERARCHY_ROLES, RoleOption } from '../../services/sales-hierarchy.service';
import { RoleFilterPipe } from './hierarchy.pipes';
import { HierarchyMapComponent } from '../hierarchy-map/hierarchy-map.component';
import { HapticService } from '../../services/haptic.service';

@Component({
  selector: 'app-salesperson-onboarding',
  templateUrl: './salesperson-onboarding.page.html',
  styleUrls: ['./salesperson-onboarding.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule, RoleFilterPipe]
})
export class SalespersonOnboardingPage implements OnInit {
  onboardingForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;

  salesPersons: SalesPerson[] = [];
  editingPerson: SalesPerson | null = null;
  showForm = false;
  searchTerm = '';

  showDeleteModal = false;
  deletingPerson: SalesPerson | null = null;
  isDeleting = false;

  readonly roles: HierarchyRole[] = HIERARCHY_ROLES;
  collapsedRoles = new Set<string>();

  toggleRoleGroup(roleValue: string) {
    this.haptic.light();
    if (this.collapsedRoles.has(roleValue)) {
      this.collapsedRoles.delete(roleValue);
    } else {
      this.collapsedRoles.add(roleValue);
    }
  }
  get visibleRoles(): HierarchyRole[] {
    const knownValues = new Set(HIERARCHY_ROLES.map(r => r.value));
    const extra = [...new Set(this.salesPersons.map(p => p.role))]
      .filter(r => r && !knownValues.has(r))
      .map(r => ({
        value: r,
        label: r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        shortLabel: r.split('_').map((w: string) => w[0]).join(''),
        icon: 'person-circle-outline'
      } as HierarchyRole));
    return [...HIERARCHY_ROLES, ...extra];
  }
  roleOptions: RoleOption[] = [];
  managersByDesignation: SalesPerson[] = [];
  isLoadingManagers = false;

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private hierarchyService: SalesHierarchyService,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadSalesPersons();
    this.loadRoleOptions();
  }

  initForm() {
    this.onboardingForm = this.fb.group({
      // Basic Information
      name:               ['', [Validators.required, Validators.minLength(2)]],
      firstName:          [''],
      lastName:           [''],
      employeeCode:       ['', [Validators.required]],
      role:               ['', [Validators.required]],
      // Personal Details
      gender:             [''],
      dateOfBirth:        [''],
      bloodGroup:         [''],
      status:             ['ACTIVE'],
      // Login Credentials
      username:           [''],
      password:           [''],
      // Organization Structure
      zone:               [''],
      region:             ['BIHAR'],
      managerDesignation: [''],
      managerId:          [null],
      // Contact Information
      phone:              ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
      alternateContactNo: [''],
      email:              ['', [Validators.email]],
      // Address
      completeAddress:    [''],
      city:               [''],
      country:            [''],
      zip:                ['']
    });

    this.onboardingForm.get('managerDesignation')!.valueChanges.subscribe(role => {
      this.onManagerDesignationChange(role ?? '');
    });
  }

  loadRoleOptions() {
    this.hierarchyService.getRolesDropdown().subscribe({
      next: (opts) => { this.roleOptions = opts; },
      error: () => {}
    });
  }

  onManagerDesignationChange(role: string) {
    this.managersByDesignation = [];
    this.onboardingForm.patchValue({ managerId: null });
    if (!role) return;
    this.isLoadingManagers = true;
    this.hierarchyService.getPersonsByRole(role).subscribe({
      next: (persons) => {
        this.managersByDesignation = persons;
        this.isLoadingManagers = false;
      },
      error: () => { this.isLoadingManagers = false; }
    });
  }

  loadSalesPersons() {
    this.isLoading = true;
    this.hierarchyService.getAllSalesPersons().subscribe({
      next: (data: SalesPerson[]) => {
        this.salesPersons = data;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get filteredPersons(): SalesPerson[] {
    if (!this.searchTerm.trim()) return this.salesPersons;
    const t = this.searchTerm.toLowerCase();
    return this.salesPersons.filter(p =>
      p.name.toLowerCase().includes(t) ||
      p.role.toLowerCase().includes(t) ||
      (p.zone ?? '').toLowerCase().includes(t) ||
      (p.region ?? '').toLowerCase().includes(t) ||
      (p.employeeCode ?? '').toLowerCase().includes(t) ||
      (p.employeeRollNo ?? '').toLowerCase().includes(t) ||
      (p.email ?? '').toLowerCase().includes(t) ||
      (p.contactNo ?? p.phone ?? '').toLowerCase().includes(t) ||
      (p.city ?? '').toLowerCase().includes(t) ||
      (p.firstName ?? '').toLowerCase().includes(t) ||
      (p.lastName ?? '').toLowerCase().includes(t) ||
      (p.managerName ?? '').toLowerCase().includes(t)
    );
  }

  // Stats helpers
  countByRole(role: string): number {
    return this.salesPersons.filter(p => p.role === role).length;
  }

  getRoleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label ?? role;
  }

  getRoleColor(role: string): string {
    const map: Record<string, string> = {
      NATIONAL_SALES_MGR: '#7c3aed',
      STATE_SALES_MGR:    '#0ea5e9',
      ZONAL_SALES_MGR:    '#0d9488',
      REGIONAL_SALES_MGR: '#8b5cf6',
      AREA_SALES_MGR:     '#f59e0b',
      SALES_OFFICER:      '#f97316',
      SALES_EXECUTIVE:    '#10b981',
      // legacy mock values
      SSM: '#0ea5e9', RSM: '#8b5cf6', ASM: '#f59e0b'
    };
    return map[role] ?? '#64748b';
  }

  getInitials(person: SalesPerson): string {
    if (person.firstName && person.lastName) {
      return (person.firstName[0] + person.lastName[0]).toUpperCase();
    }
    const parts = person.name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }

  openAddForm() {
    this.haptic.medium();
    this.editingPerson = null;
    this.managersByDesignation = [];
    this.onboardingForm.reset({
      name: '', firstName: '', lastName: '', employeeCode: '', role: '',
      gender: '', dateOfBirth: '', bloodGroup: '', status: 'ACTIVE',
      username: '', password: '',
      zone: '', region: 'BIHAR', managerDesignation: '', managerId: null,
      phone: '', alternateContactNo: '', email: '',
      completeAddress: '', city: '', country: '', zip: ''
    });
    this.showForm = true;
  }

  openEditForm(person: SalesPerson) {
    this.haptic.medium();
    this.editingPerson = person;
    this.managersByDesignation = [];

    const managerDesignation = person.managerId
      ? (this.salesPersons.find(p => p.id === person.managerId)?.role ?? '')
      : '';

    this.onboardingForm.patchValue({
      name:               person.name,
      firstName:          person.firstName ?? '',
      lastName:           person.lastName ?? '',
      employeeCode:       person.employeeRollNo ?? person.employeeCode,
      role:               person.role,
      gender:             person.gender ?? '',
      dateOfBirth:        person.dateOfBirth ?? '',
      bloodGroup:         person.bloodGroup ?? '',
      status:             person.status ?? 'ACTIVE',
      username:           person.username ?? '',
      password:           '',
      zone:               person.zone ?? '',
      region:             person.region ?? 'BIHAR',
      managerDesignation: managerDesignation,
      managerId:          null,
      phone:              person.phone ?? person.contactNo ?? '',
      alternateContactNo: person.alternateContactNo ?? '',
      email:              person.email ?? '',
      completeAddress:    person.completeAddress ?? '',
      city:               person.city ?? '',
      country:            person.country ?? '',
      zip:                person.zip ?? ''
    });

    if (managerDesignation) {
      this.isLoadingManagers = true;
      this.hierarchyService.getPersonsByRole(managerDesignation).subscribe({
        next: (persons) => {
          this.managersByDesignation = persons;
          this.onboardingForm.patchValue({ managerId: person.managerId ?? null });
          this.isLoadingManagers = false;
        },
        error: () => { this.isLoadingManagers = false; }
      });
    }

    this.showForm = true;
  }

  closeForm() {
    this.haptic.light();
    this.showForm = false;
    this.editingPerson = null;
  }

  async submitForm() {
    this.haptic.medium();
    if (this.onboardingForm.invalid) {
      this.onboardingForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const raw = this.onboardingForm.value;
    // Build payload that matches the /api/sales-hierarchy/update & /create schema exactly
    const contactValue = raw.phone?.trim() || undefined;
    const statusValue  = raw.status || 'ACTIVE';
    const payload: Partial<SalesPerson> = {
      name:               raw.name?.trim(),
      firstName:          raw.firstName?.trim() || undefined,
      lastName:           raw.lastName?.trim() || undefined,
      employeeRollNo:     raw.employeeCode?.trim() || undefined,
      role:               raw.role,
      gender:             raw.gender || undefined,
      dateOfBirth:        raw.dateOfBirth || undefined,
      bloodGroup:         raw.bloodGroup?.trim() || undefined,
      status:             statusValue,
      active:             statusValue === 'ACTIVE',
      username:           raw.username?.trim() || undefined,
      // Only send password if user typed something (on edit: leave blank = keep current)
      ...(raw.password ? { password: raw.password } : {}),
      zone:               raw.zone?.trim() || undefined,
      region:             raw.region?.trim() || undefined,
      managerId:          raw.managerId ?? null,
      contactNo:          contactValue,
      phone:              contactValue,
      alternateContactNo: raw.alternateContactNo?.trim() || undefined,
      email:              raw.email?.trim() || undefined,
      completeAddress:    raw.completeAddress?.trim() || undefined,
      city:               raw.city?.trim() || undefined,
      country:            raw.country?.trim() || undefined,
      zip:                raw.zip?.trim() || undefined
    };

    const request$ = this.editingPerson
      ? this.hierarchyService.updateSalesPerson(this.editingPerson.id, payload)
      : this.hierarchyService.createSalesPerson(payload);

    request$.subscribe({
      next: async () => {
        this.isSubmitting = false;
        this.showForm = false;
        this.loadSalesPersons();
        await this.toast(this.editingPerson ? 'Salesperson updated!' : 'Salesperson onboarded!', 'success');
        this.editingPerson = null;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.isSubmitting = false;
        await this.toast(err?.error?.message ?? 'Failed to save. Please try again.', 'danger');
      }
    });
  }

  confirmDelete(person: SalesPerson) {
    this.haptic.heavy();
    this.deletingPerson = person;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.haptic.light();
    this.showDeleteModal = false;
    this.deletingPerson = null;
  }

  async deletePerson() {
    this.haptic.heavy();
    if (!this.deletingPerson) return;
    const person = this.deletingPerson;
    this.isDeleting = true;
    this.hierarchyService.deleteSalesPerson(person.id).subscribe({
      next: async () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.deletingPerson = null;
        this.loadSalesPersons();
        await this.toast(`${person.name} removed`, 'success');
      },
      error: async () => {
        this.isDeleting = false;
        await this.toast('Failed to delete', 'danger');
      }
    });
  }

  getManagerName(managerId: number | null | undefined): string {
    if (!managerId) return '—';
    const m = this.salesPersons.find(p => p.id === managerId);
    return m ? `${m.name} (${this.getRoleLabel(m.role)})` : '—';
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const t = await this.toastController.create({ message, duration: 3000, color, position: 'bottom' });
    await t.present();
  }

  async openHierarchyMap() {
    const modal = await this.modalController.create({
      component: HierarchyMapComponent,
      presentingElement: await this.modalController.getTop(),
      cssClass: 'hierarchy-map-modal',
      backdropDismiss: true
    });
    await modal.present();
  }
}
