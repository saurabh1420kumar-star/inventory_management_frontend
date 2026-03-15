import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ComplaintsService, Complaint } from '../services/complaints.service';

@Component({
  selector: 'app-complaints-management',
  templateUrl: './complaints-management.page.html',
  styleUrls: ['./complaints-management.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ComplaintsManagementPage implements OnInit {
  complaints: Complaint[] = [];
  isLoading = false;
  errorMessage = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  searchTerm = '';
  filterStatus = '';
  filterCategory = '';

  statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  categoryOptions = ['PAYMENT', 'PRODUCT', 'SERVICE', 'DELIVERY', 'OTHER'];

  selectedComplaint: Complaint | null = null;
  isDetailModalOpen = false;
  isStatusModalOpen = false;
  newStatus = '';

  constructor(private complaintsService: ComplaintsService) {}

  ngOnInit() {
    this.loadComplaints();
  }

  loadComplaints() {
    this.isLoading = true;
    this.errorMessage = '';

    this.complaintsService.getComplaints(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        console.log('Complaints loaded:', response);
        this.complaints = response.data?.content || [];
        this.totalPages = response.data?.pageable?.pageNumber || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading complaints:', err);
        this.errorMessage = 'Failed to load complaints. Please try again.';
        this.isLoading = false;
      },
    });
  }

  get filteredComplaints(): Complaint[] {
    return this.complaints.filter(complaint => {
      const matchesSearchTerm = this.searchTerm === '' || 
        complaint.subject.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        complaint.fullName.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.filterStatus === '' || complaint.status === this.filterStatus;
      const matchesCategory = this.filterCategory === '' || complaint.category === this.filterCategory;

      return matchesSearchTerm && matchesStatus && matchesCategory;
    });
  }

  openDetailModal(complaint: Complaint) {
    this.selectedComplaint = complaint;
    this.isDetailModalOpen = true;
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.selectedComplaint = null;
  }

  openStatusModal(complaint: Complaint) {
    this.selectedComplaint = complaint;
    this.newStatus = complaint.status;
    this.isStatusModalOpen = true;
  }

  closeStatusModal() {
    this.isStatusModalOpen = false;
    this.selectedComplaint = null;
    this.newStatus = '';
  }

  updateStatus() {
    if (!this.selectedComplaint || !this.newStatus) return;

    this.isLoading = true;
    this.complaintsService.updateComplaintStatus(this.selectedComplaint.id, this.newStatus).subscribe({
      next: () => {
        console.log('Complaint status updated');
        this.selectedComplaint!.status = this.newStatus as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
        this.closeStatusModal();
        this.loadComplaints(); // Reload to get updated data
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.errorMessage = err?.error?.message || 'Failed to update status.';
        this.isLoading = false;
      },
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
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

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'OPEN':
        return '#ef4444'; // red
      case 'IN_PROGRESS':
        return '#f59e0b'; // amber
      case 'RESOLVED':
        return '#10b981'; // green
      case 'CLOSED':
        return '#6366f1'; // indigo
      default:
        return '#64748b'; // slate
    }
  }

  getPriorityBadgeColor(priority: string): string {
    switch (priority) {
      case 'LOW':
        return '#3b82f6'; // blue
      case 'MEDIUM':
        return '#f59e0b'; // amber
      case 'HIGH':
        return '#ef4444'; // red
      case 'CRITICAL':
        return '#7c3aed'; // violet
      default:
        return '#64748b'; // slate
    }
  }
}
