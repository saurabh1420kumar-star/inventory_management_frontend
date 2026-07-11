import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ComplaintsService, Complaint } from '../services/complaints.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { AclDirective } from '../acl/acl.directive';

@Component({
  selector: 'app-complaints-management',
  templateUrl: './complaints-management.page.html',
  styleUrls: ['./complaints-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AclDirective],
})
export class ComplaintsManagementPage implements OnInit {
  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'COMPLAINTS_MANAGEMENT';

  complaints: Complaint[] = [];
  isLoading = false;
  isUpdatingStatus = false;
  errorMessage = '';
  currentPage = 1;
  pageSize = 10;
  isLastPage = false;
  isFirstPage = true;
  searchTerm = '';
  filterStatus = '';
  filterCategory = '';

  statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  categoryOptions = ['PAYMENT', 'ACCOUNT', 'TECHNICAL', 'DELIVERY', 'OTHER'];

  selectedComplaint: Complaint | null = null;
  isDetailModalOpen = false;
  isStatusModalOpen = false;
  newStatus = '';
  statusComment = '';

  private readonly statusConfigs: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
    'OPEN':        { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Open',        icon: 'radio-button-on-outline' },
    'IN_PROGRESS': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'In Progress', icon: 'time-outline' },
    'RESOLVED':    { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'Resolved',    icon: 'checkmark-circle-outline' },
    'CLOSED':      { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', label: 'Closed',      icon: 'lock-closed-outline' },
  };

  private readonly priorityConfigs: Record<string, { color: string; bg: string; label: string }> = {
    'LOW':      { color: '#3b82f6', bg: '#eff6ff', label: 'Low' },
    'MEDIUM':   { color: '#f59e0b', bg: '#fffbeb', label: 'Medium' },
    'HIGH':     { color: '#ef4444', bg: '#fef2f2', label: 'High' },
    'CRITICAL': { color: '#7c3aed', bg: '#f5f3ff', label: 'Critical' },
  };

  private haptic = inject(HapticService);

  constructor(
    private complaintsService: ComplaintsService,
    private toast: Toast
  ) {}

  ngOnInit() {
    this.loadComplaints();
  }

  loadComplaints() {
    this.isLoading = true;
    this.errorMessage = '';
    const pageIndex = this.currentPage - 1;

    this.complaintsService.getComplaints(pageIndex, this.pageSize).subscribe({
      next: (response) => {
        this.complaints = response.data?.content || [];
        this.isLastPage = response.data?.last || false;
        this.isFirstPage = response.data?.first || false;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load complaints. Please try again.';
        this.isLoading = false;
      },
    });
  }

  handlePullRefresh(event: any) {
    this.loadComplaints();
    setTimeout(() => event.target.complete(), 1500);
  }

  get filteredComplaints(): Complaint[] {
    return this.complaints.filter(c => {
      const matchesSearch = !this.searchTerm ||
        c.subject.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.fullName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.filterStatus || c.status === this.filterStatus;
      const matchesCategory = !this.filterCategory || c.category === this.filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterStatus || this.filterCategory);
  }

  get stats() {
    return {
      open:       this.complaints.filter(c => c.status === 'OPEN').length,
      inProgress: this.complaints.filter(c => c.status === 'IN_PROGRESS').length,
      resolved:   this.complaints.filter(c => c.status === 'RESOLVED').length,
      closed:     this.complaints.filter(c => c.status === 'CLOSED').length,
      total:      this.complaints.length,
    };
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterCategory = '';
  }

  openDetailModal(complaint: Complaint) {
    this.haptic.light();
    this.selectedComplaint = complaint;
    this.isDetailModalOpen = true;
  }

  closeDetailModal() {
    this.haptic.light();
    this.isDetailModalOpen = false;
    this.selectedComplaint = null;
  }

  openStatusModal(complaint: Complaint) {
    this.haptic.medium();
    this.selectedComplaint = complaint;
    this.newStatus = complaint.status;
    this.statusComment = complaint.comment || '';
    this.isStatusModalOpen = true;
  }

  closeStatusModal() {
    this.haptic.light();
    this.isStatusModalOpen = false;
    this.selectedComplaint = null;
    this.newStatus = '';
    this.statusComment = '';
  }

  updateStatus() {
    this.haptic.medium();
    if (!this.selectedComplaint || !this.newStatus) return;
    const targetId = this.selectedComplaint.id;
    const targetStatus = this.newStatus as Complaint['status'];
    this.isUpdatingStatus = true;

    const comment = this.statusComment;
    this.complaintsService.updateComplaintStatus(targetId, targetStatus, comment).subscribe({
      next: () => {
        const idx = this.complaints.findIndex(c => c.id === targetId);
        if (idx !== -1) {
          this.complaints[idx] = { ...this.complaints[idx], status: targetStatus, comment: comment.trim() || this.complaints[idx].comment };
        }
        this.isUpdatingStatus = false;
        this.closeStatusModal();
        this.toast.present('Complaint status updated successfully!', 'success');
      },
      error: (err) => {
        this.isUpdatingStatus = false;
        const msg = err?.error?.message || 'Failed to update status. Please try again.';
        this.toast.present(msg, 'danger');
      },
    });
  }

  nextPage() {
    if (!this.isLastPage) {
      this.currentPage++;
      this.loadComplaints();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadComplaints();
    }
  }

  getStatusConfig(status: string) {
    return this.statusConfigs[status] ?? { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: status, icon: 'help-outline' };
  }

  getPriorityConfig(priority: string) {
    return this.priorityConfigs[priority] ?? { color: '#64748b', bg: '#f8fafc', label: priority };
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
