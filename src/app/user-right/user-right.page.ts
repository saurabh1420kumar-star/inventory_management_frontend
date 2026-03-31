import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

export type AccessLevel = 'NONE' | 'READ' | 'EDIT';

export interface ModulePermission {
  featureKey: string;
  displayName: string;
  icon: string;
  category: string;
  access: AccessLevel;
}

export interface PermissionCategory {
  name: string;
  icon: string;
  color: string;
  modules: ModulePermission[];
}

@Component({
  selector: 'app-user-right',
  templateUrl: './user-right.page.html',
  styleUrls: ['./user-right.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ]
})
export class UserRightPage implements OnInit {
  // Data
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  permissionCategories: PermissionCategory[] = [];

  // UI State
  isLoading = true;
  isSaving = false;
  searchQuery = '';
  roleFilter = 'ALL';
  statusFilter = 'ALL';
  hasUnsavedChanges = false;
  showUserPanel = true;

  // Snapshot for dirty tracking
  private originalPermissions: Record<string, AccessLevel> = {};

  roles = [
    { value: 'ALL', label: 'All Roles' },
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

  private haptic = inject(HapticService);

  constructor(
    private alertController: AlertController,
    private toast: Toast,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.buildPermissionTemplate();
    this.loadUsers();
  }

  // ─── DATA LOADING ──────────────────────────────────────────

  loadUsers() {
    this.isLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.toast.present('Failed to load users', 'danger');
        this.isLoading = false;
      }
    });
  }

  buildPermissionTemplate(): PermissionCategory[] {
    this.permissionCategories = [
      {
        name: 'Core',
        icon: 'grid-outline',
        color: 'blue',
        modules: [
          { featureKey: 'DASHBOARD', displayName: 'Dashboard', icon: 'speedometer-outline', category: 'Core', access: 'NONE' },
          { featureKey: 'OPERATIONS', displayName: 'Operations', icon: 'construct-outline', category: 'Core', access: 'NONE' },
          { featureKey: 'FEEDBACK', displayName: 'Feedback', icon: 'chatbubbles-outline', category: 'Core', access: 'NONE' },
        ]
      },
      {
        name: 'Inventory',
        icon: 'cube-outline',
        color: 'emerald',
        modules: [
          { featureKey: 'INVENTORY_MASTERS', displayName: 'Master Inventory', icon: 'albums-outline', category: 'Inventory', access: 'NONE' },
          { featureKey: 'INVENTORY_TRANSACTIONS', displayName: 'Machine Parts', icon: 'cog-outline', category: 'Inventory', access: 'NONE' },
          { featureKey: 'UNIT_MASTER', displayName: 'Unit Master', icon: 'layers-outline', category: 'Inventory', access: 'NONE' },
        ]
      },
      {
        name: 'Accounts',
        icon: 'wallet-outline',
        color: 'violet',
        modules: [
          { featureKey: 'ACCOUNTS', displayName: 'Accounts Master', icon: 'book-outline', category: 'Accounts', access: 'NONE' },
          { featureKey: 'ACCOUNTS_TRANSACTION', displayName: 'Transactions', icon: 'swap-horizontal-outline', category: 'Accounts', access: 'NONE' },
          { featureKey: 'PAYMENT_REQUEST', displayName: 'Payment Requests', icon: 'card-outline', category: 'Accounts', access: 'NONE' },
        ]
      },
      {
        name: 'Sales & Distribution',
        icon: 'trending-up-outline',
        color: 'amber',
        modules: [
          { featureKey: 'SALES', displayName: 'Sales Management', icon: 'bar-chart-outline', category: 'Sales & Distribution', access: 'NONE' },
          { featureKey: 'DISTRIBUTOR', displayName: 'Distributor', icon: 'people-outline', category: 'Sales & Distribution', access: 'NONE' },
          { featureKey: 'ORDER_DETAILS', displayName: 'Order Tracking', icon: 'locate-outline', category: 'Sales & Distribution', access: 'NONE' },
          { featureKey: 'PROFORMA_INVOICE', displayName: 'Proforma Invoice', icon: 'document-text-outline', category: 'Sales & Distribution', access: 'NONE' },
        ]
      },
      {
        name: 'Logistics',
        icon: 'bus-outline',
        color: 'sky',
        modules: [
          { featureKey: 'DISPATCH', displayName: 'Dispatch', icon: 'paper-plane-outline', category: 'Logistics', access: 'NONE' },
          { featureKey: 'GDN', displayName: 'GDN', icon: 'receipt-outline', category: 'Logistics', access: 'NONE' },
          { featureKey: 'LOGISTICS', displayName: 'Logistics', icon: 'car-outline', category: 'Logistics', access: 'NONE' },
        ]
      },
      {
        name: 'HR',
        icon: 'people-circle-outline',
        color: 'rose',
        modules: [
          { featureKey: 'HR', displayName: 'HR Department', icon: 'business-outline', category: 'HR', access: 'NONE' },
          { featureKey: 'HR_DESIGNATION', displayName: 'Designation', icon: 'ribbon-outline', category: 'HR', access: 'NONE' },
          { featureKey: 'HR_EMPLOYEE', displayName: 'Employee', icon: 'person-outline', category: 'HR', access: 'NONE' },
        ]
      },
      {
        name: 'Support',
        icon: 'help-buoy-outline',
        color: 'orange',
        modules: [
          { featureKey: 'COMPLAINT', displayName: 'Complaints', icon: 'warning-outline', category: 'Support', access: 'NONE' },
          { featureKey: 'COMPLAINTS_MANAGEMENT', displayName: 'Manage Complaints', icon: 'shield-checkmark-outline', category: 'Support', access: 'NONE' },
        ]
      },
      {
        name: 'Administration',
        icon: 'settings-outline',
        color: 'slate',
        modules: [
          { featureKey: 'USER_RIGHTS', displayName: 'User Rights', icon: 'key-outline', category: 'Administration', access: 'NONE' },
        ]
      },
    ];
    return this.permissionCategories;
  }

  // ─── FILTERING ─────────────────────────────────────────────

  applyFilters() {
    let users = [...this.allUsers];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      users = users.filter(u =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }

    if (this.roleFilter !== 'ALL') {
      users = users.filter(u => u.roleType === this.roleFilter);
    }

    if (this.statusFilter !== 'ALL') {
      users = users.filter(u => u.status === this.statusFilter);
    }

    this.filteredUsers = users;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  // ─── USER SELECTION ────────────────────────────────────────

  async selectUser(user: User) {
    if (this.hasUnsavedChanges) {
      const alert = await this.alertController.create({
        header: 'Unsaved Changes',
        message: 'You have unsaved permission changes. Discard them?',
        buttons: [
          { text: 'Stay', role: 'cancel' },
          { text: 'Discard', role: 'destructive', handler: () => this.doSelectUser(user) }
        ]
      });
      await alert.present();
      return;
    }
    this.doSelectUser(user);
  }

  private doSelectUser(user: User) {
    this.haptic.light();
    this.selectedUser = user;
    this.hasUnsavedChanges = false;
    this.showUserPanel = false;

    // Reset permissions and load from user features
    this.buildPermissionTemplate();
    this.loadUserPermissions(user);
    this.snapshotPermissions();
  }

  private loadUserPermissions(user: User) {
    // Map user's existing features to permissions
    // The user's roles array or features stored in backend would populate this
    // For now, we check feature names against our module keys
    const userFeatures: string[] = (user as any).featureNames || [];
    const userPermissions: Record<string, AccessLevel> = (user as any).permissions || {};

    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        if (userPermissions[mod.featureKey]) {
          mod.access = userPermissions[mod.featureKey];
        } else if (userFeatures.includes(mod.featureKey)) {
          mod.access = 'EDIT'; // Legacy: if they had the feature, assume full edit
        } else {
          mod.access = 'NONE';
        }
      }
    }
  }

  private snapshotPermissions() {
    this.originalPermissions = {};
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        this.originalPermissions[mod.featureKey] = mod.access;
      }
    }
  }

  // ─── PERMISSION CHANGES ────────────────────────────────────

  setAccess(mod: ModulePermission, level: AccessLevel) {
    this.haptic.light();
    mod.access = level;
    this.checkDirty();
  }

  private checkDirty() {
    this.hasUnsavedChanges = false;
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        if (mod.access !== this.originalPermissions[mod.featureKey]) {
          this.hasUnsavedChanges = true;
          return;
        }
      }
    }
  }

  // ─── BULK ACTIONS ──────────────────────────────────────────

  setAllAccess(level: AccessLevel) {
    this.haptic.medium();
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        mod.access = level;
      }
    }
    this.checkDirty();
  }

  setCategoryAccess(category: PermissionCategory, level: AccessLevel) {
    this.haptic.light();
    for (const mod of category.modules) {
      mod.access = level;
    }
    this.checkDirty();
  }

  // ─── SAVE / DISCARD ───────────────────────────────────────

  async savePermissions() {
    if (!this.selectedUser) return;
    this.haptic.medium();

    const alert = await this.alertController.create({
      header: 'Save Permissions',
      message: `Update access rights for ${this.selectedUser.firstName} ${this.selectedUser.lastName}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', handler: () => this.performSave() }
      ]
    });
    await alert.present();
  }

  private async performSave() {
    if (!this.selectedUser) return;
    this.isSaving = true;

    const permissions: Record<string, AccessLevel> = {};
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        permissions[mod.featureKey] = mod.access;
      }
    }

    // TODO: Replace with actual API call:
    // this.userService.updateUserPermissions(this.selectedUser.id, permissions).subscribe(...)
    try {
      await this.delay(1200);
      this.snapshotPermissions();
      this.hasUnsavedChanges = false;
      this.toast.present('Permissions saved successfully!', 'success');
    } catch {
      this.toast.present('Failed to save permissions', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  discardChanges() {
    this.haptic.light();
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        mod.access = this.originalPermissions[mod.featureKey] || 'NONE';
      }
    }
    this.hasUnsavedChanges = false;
  }

  // ─── HELPERS ───────────────────────────────────────────────

  getUserInitials(user: User): string {
    return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase();
  }

  getRoleBadgeColor(role: string): string {
    const map: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-700',
      'SUPER_ADMIN': 'bg-purple-100 text-purple-700',
      'BUSINESS_DEV_MGR': 'bg-blue-100 text-blue-700',
      'PLANT_MGR': 'bg-emerald-100 text-emerald-700',
      'HR_MGR': 'bg-pink-100 text-pink-700',
      'LOGISTICS_MGR': 'bg-sky-100 text-sky-700',
      'ACCOUNT_MGR': 'bg-violet-100 text-violet-700',
      'NATIONAL_SALES_MGR': 'bg-amber-100 text-amber-700',
    };
    return map[role] || 'bg-slate-100 text-slate-700';
  }

  getStatusColor(status: string): string {
    if (status === 'ACTIVE') return 'bg-emerald-500';
    if (status === 'SUSPENDED' || status === 'REJECTED') return 'bg-red-500';
    return 'bg-amber-500';
  }

  getStatusBadge(status: string): { bg: string; text: string; dot: string; label: string } {
    switch (status) {
      case 'ACTIVE':    return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' };
      case 'SUSPENDED': return { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Suspended' };
      case 'REJECTED':  return { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rejected' };
      case 'PENDING':   return { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending' };
      default:          return { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400',   label: status || 'Unknown' };
    }
  }

  formatLastLogin(lastLoginTime: string | null): string {
    if (!lastLoginTime) return 'Never';
    const now = new Date();
    const then = new Date(lastLoginTime);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1)   return 'Just now';
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7)   return `${diffDays}d ago`;
    return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatJoinDate(createdOn: string): string {
    if (!createdOn) return '';
    return new Date(createdOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getActiveCount(): number {
    return this.filteredUsers.filter(u => u.status === 'ACTIVE').length;
  }

  formatRole(roleType: string | null | undefined): string {
    if (!roleType) return 'No Role';
    return roleType.replace(/_/g, ' ');
  }

  getCategoryColorClasses(color: string): { bg: string; text: string; border: string; bgLight: string } {
    const map: Record<string, any> = {
      'blue':    { bg: 'bg-blue-500',    text: 'text-blue-600',    border: 'border-blue-200',    bgLight: 'bg-blue-50' },
      'emerald': { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', bgLight: 'bg-emerald-50' },
      'violet':  { bg: 'bg-violet-500',  text: 'text-violet-600',  border: 'border-violet-200',  bgLight: 'bg-violet-50' },
      'amber':   { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-200',   bgLight: 'bg-amber-50' },
      'sky':     { bg: 'bg-sky-500',     text: 'text-sky-600',     border: 'border-sky-200',     bgLight: 'bg-sky-50' },
      'rose':    { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-200',    bgLight: 'bg-rose-50' },
      'orange':  { bg: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-200',  bgLight: 'bg-orange-50' },
      'slate':   { bg: 'bg-slate-500',   text: 'text-slate-600',   border: 'border-slate-200',   bgLight: 'bg-slate-100' },
    };
    return map[color] || map['slate'];
  }

  getPermissionStats(): { total: number; edit: number; read: number; none: number } {
    let total = 0, edit = 0, read = 0, none = 0;
    for (const cat of this.permissionCategories) {
      for (const mod of cat.modules) {
        total++;
        if (mod.access === 'EDIT') edit++;
        else if (mod.access === 'READ') read++;
        else none++;
      }
    }
    return { total, edit, read, none };
  }

  toggleUserPanel() {
    this.showUserPanel = !this.showUserPanel;
  }

  backToUsers() {
    this.showUserPanel = true;
    this.selectedUser = null;
  }

  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}