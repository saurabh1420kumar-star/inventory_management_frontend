import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ComplaintsService, Complaint } from '../services/complaints.service';
import { Auth } from '../services/auth';
import { HapticService } from '../services/haptic.service';

@Component({
  selector: 'app-complaint-resolution',
  templateUrl: './complaint-resolution.page.html',
  styleUrls: ['./complaint-resolution.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ComplaintResolutionPage implements OnInit {
  complaints: Complaint[] = [];
  isLoading = false;
  errorMessage = '';
  currentPage = 0;
  pageSize = 10;
  isLastPage = false;
  isFirstPage = true;
  selectedStatus = 'ALL';
  expandedId: number | null = null;

  private userRole: string | null = null;
  private userId: number | null = null;
  private haptic = inject(HapticService);

  readonly statusOptions = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  readonly statusConfigs: Record<string, { color: string; bg: string; border: string; label: string; icon: string; gradient: string }> = {
    'OPEN':        { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.35)',    label: 'Open',        icon: 'radio-button-on-outline',   gradient: 'linear-gradient(135deg,#ef4444,#f87171)' },
    'IN_PROGRESS': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.35)',   label: 'In Progress', icon: 'time-outline',               gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    'RESOLVED':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.35)',   label: 'Resolved',    icon: 'checkmark-circle-outline',   gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
    'CLOSED':      { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.35)',   label: 'Closed',      icon: 'lock-closed-outline',        gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  };

  readonly priorityConfigs: Record<string, { color: string; bg: string; label: string }> = {
    'LOW':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  label: 'Low' },
    'MEDIUM':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Medium' },
    'HIGH':     { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'High' },
    'CRITICAL': { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'Critical' },
  };

  readonly categoryIcons: Record<string, string> = {
    'PAYMENT': 'wallet-outline',
    'ACCOUNT': 'person-circle-outline',
    'TECHNICAL': 'construct-outline',
    'DELIVERY': 'cube-outline',
    'OTHER': 'ellipsis-horizontal-circle-outline',
  };

  constructor(
    private complaintsService: ComplaintsService,
    private auth: Auth,
  ) {}

  ngOnInit() {
    this.userRole = this.auth.getRoleType();
    this.userId = this.auth.getUserId();
    this.loadComplaints();
  }

  loadComplaints() {
    if (!this.userId) return;
    this.isLoading = true;
    this.errorMessage = '';
    const isDistributor = this.userRole === 'DISTRIBUTOR';
    this.complaintsService.getComplaintsByFilter({
      salespersonId: isDistributor ? null : this.userId,
      distributorId: isDistributor ? this.userId : null,
      page: this.currentPage,
      size: this.pageSize,
    }).subscribe({
      next: (response) => {
        this.complaints = response.data?.content || [];
        this.isLastPage = response.data?.last ?? true;
        this.isFirstPage = response.data?.first ?? true;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load complaints. Please try again.';
        this.isLoading = false;
      },
    });
  }

  handlePullRefresh(event: any) {
    this.currentPage = 0;
    this.loadComplaints();
    setTimeout(() => event.target.complete(), 1500);
  }

  get filteredComplaints(): Complaint[] {
    if (this.selectedStatus === 'ALL') return this.complaints;
    return this.complaints.filter(c => c.status === this.selectedStatus);
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

  onSegmentChange(event: any) {
    this.haptic.light();
    this.selectedStatus = event.detail.value;
    this.expandedId = null;
  }

  onStatusSelect(status: string) {
    this.haptic.light();
    this.selectedStatus = status;
    this.expandedId = null;
  }

  getStatusTabBg(status: string): string {
    const map: Record<string, string> = {
      'ALL':         'rgba(255,255,255,0.12)',
      'OPEN':        'rgba(239,68,68,0.2)',
      'IN_PROGRESS': 'rgba(245,158,11,0.2)',
      'RESOLVED':    'rgba(16,185,129,0.2)',
      'CLOSED':      'rgba(99,102,241,0.2)',
    };
    return map[status] ?? 'rgba(255,255,255,0.1)';
  }

  getStatusTabColor(status: string): string {
    const map: Record<string, string> = {
      'ALL':         '#ffffff',
      'OPEN':        '#f87171',
      'IN_PROGRESS': '#fbbf24',
      'RESOLVED':    '#34d399',
      'CLOSED':      '#818cf8',
    };
    return map[status] ?? '#ffffff';
  }

  toggleExpand(id: number) {
    this.haptic.light();
    this.expandedId = this.expandedId === id ? null : id;
  }

  nextPage() {
    if (!this.isLastPage) {
      this.currentPage++;
      this.loadComplaints();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadComplaints();
    }
  }

  getStatusConfig(status: string) {
    return this.statusConfigs[status] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', label: status, icon: 'help-outline', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' };
  }

  getPriorityConfig(priority: string) {
    return this.priorityConfigs[priority] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: priority };
  }

  getCategoryIcon(category: string): string {
    return this.categoryIcons[category] || 'help-circle-outline';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  trackById(_: number, c: Complaint): number {
    return c.id;
  }
}
