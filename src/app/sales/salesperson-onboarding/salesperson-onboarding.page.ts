import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SalesHierarchyService, SalesPerson, HierarchyRole, HIERARCHY_ROLES } from '../../services/sales-hierarchy.service';
import { RoleCountPipe, RoleFilterPipe } from './hierarchy.pipes';
import { HierarchyMapComponent } from '../hierarchy-map/hierarchy-map.component';

@Component({
  selector: 'app-salesperson-onboarding',
  templateUrl: './salesperson-onboarding.page.html',
  styleUrls: ['./salesperson-onboarding.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule, RoleCountPipe, RoleFilterPipe, HierarchyMapComponent]
})
export class SalespersonOnboardingPage implements OnInit {
  onboardingForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;

  salesPersons: SalesPerson[] = [];
  editingPerson: SalesPerson | null = null;
  showForm = false;
  searchTerm = '';

  readonly roles: HierarchyRole[] = HIERARCHY_ROLES;
  potentialManagers: SalesPerson[] = [];

  zones = ['S BIHAR', 'N BIHAR'];

  constructor(
    private fb: FormBuilder,
    private hierarchyService: SalesHierarchyService,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadSalesPersons();
  }

  initForm() {
    this.onboardingForm = this.fb.group({
      name:         ['', [Validators.required, Validators.minLength(2)]],
      employeeCode: ['', [Validators.required]],
      role:         ['SALES_EXECUTIVE', [Validators.required]],
      zone:         [''],
      region:       ['BIHAR'],
      phone:        ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
      email:        ['', [Validators.email]],
      managerId:    [null]
    });

    this.onboardingForm.get('role')!.valueChanges.subscribe(role => {
      this.updateManagerOptions(role);
    });
  }

  updateManagerOptions(role: string) {
    const managerRoleMap: Record<string, string> = {
      RSM:             'SSM',
      ASM:             'RSM',
      SALES_EXECUTIVE: 'ASM'
    };
    const managerRole = managerRoleMap[role];
    this.potentialManagers = managerRole
      ? this.salesPersons.filter(p => p.role === managerRole)
      : [];
    this.onboardingForm.patchValue({ managerId: null });
  }

  loadSalesPersons() {
    this.isLoading = true;
    this.hierarchyService.getAllSalesPersons().subscribe({
      next: (data: SalesPerson[]) => {
        this.salesPersons = data;
        const currentRole = this.onboardingForm.get('role')?.value;
        if (currentRole) this.updateManagerOptions(currentRole);
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
      p.employeeCode.toLowerCase().includes(t)
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
      SSM:             '#0ea5e9',
      RSM:             '#8b5cf6',
      ASM:             '#f59e0b',
      SALES_EXECUTIVE: '#10b981'
    };
    return map[role] ?? '#64748b';
  }

  openAddForm() {
    this.editingPerson = null;
    this.onboardingForm.reset({ role: 'SALES_EXECUTIVE', region: 'BIHAR', zone: '', phone: '', email: '' });
    this.updateManagerOptions('SALES_EXECUTIVE');
    this.showForm = true;
  }

  openEditForm(person: SalesPerson) {
    this.editingPerson = person;
    this.onboardingForm.patchValue({
      name:         person.name,
      employeeCode: person.employeeCode,
      role:         person.role,
      zone:         person.zone ?? '',
      region:       person.region ?? 'BIHAR',
      phone:        person.phone ?? '',
      email:        person.email ?? '',
      managerId:    person.managerId ?? null
    });
    this.updateManagerOptions(person.role);
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingPerson = null;
  }

  async submitForm() {
    if (this.onboardingForm.invalid) {
      this.onboardingForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const raw = this.onboardingForm.value;
    // Convert empty strings to undefined for cleanliness
    const payload: Partial<SalesPerson> = {
      name:         raw.name?.trim(),
      employeeCode: raw.employeeCode?.trim(),
      role:         raw.role,
      zone:         raw.zone || undefined,
      region:       raw.region || 'BIHAR',
      phone:        raw.phone || undefined,
      email:        raw.email || undefined,
      managerId:    raw.managerId ?? null
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

  async confirmDelete(person: SalesPerson) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Remove ${person.name} (${this.getRoleLabel(person.role)}) from the team?`,
      cssClass: 'custom-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deletePerson(person) }
      ]
    });
    await alert.present();
  }

  deletePerson(person: SalesPerson) {
    this.hierarchyService.deleteSalesPerson(person.id).subscribe({
      next: async () => {
        this.loadSalesPersons();
        await this.toast(`${person.name} removed`, 'success');
      },
      error: async () => { await this.toast('Failed to delete', 'danger'); }
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
