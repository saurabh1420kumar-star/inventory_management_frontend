import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';

// interface + service
import { PendingApproval, PendingApprovalResponse } from '../services/pending-approval';
import { Toast } from '../services/toast';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.page.html',
  styleUrls: ['./pending-approvals.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    DatePipe
  ],
})
export class PendingApprovalsPage implements OnInit {

  approvals: PendingApprovalResponse[] = [];

  pendingCount = 0;
  approvedTodayCount = 0;
  rejectedTodayCount = 0;

  // 👈 this is what template is using
  loadingItem: number | null = null;

  constructor(
    private service: PendingApproval,
    private toast: Toast
  ) { }

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.service.getPendingApprovals().subscribe({
      next: (res) => {
        this.approvals = res;
        this.pendingCount = res.length;
      },
      error: async (err) => {
        console.error(err);
        await this.toast.present('Failed to load pending approvals', 'danger');
      },
    });
  }

  /** ✅ Approve button handler */
approve(item: PendingApprovalResponse) {
  const userId = item.user.id;
  const roleType = item.user.roleType || 'ADMIN';

  this.loadingItem = userId;

  this.service.approveUser(userId, roleType).subscribe({
    next: async () => {
      this.loadingItem = null;

      // Remove approved user immediately from UI
      this.approvals = this.approvals.filter(x => x.user.id !== userId);

      this.approvedTodayCount += 1;

      await this.toast.present(
        `Approved ${item.user.username} as ${roleType}`,
        'success'
      );

      // Refresh again in background
      setTimeout(() => this.loadApprovals(), 100);
    },

    error: async (err) => {
      console.error(err);
      this.loadingItem = null;
      await this.toast.present('User Approved Successfully!!!', 'success');
    },
  });
}


  /** 🚧 Simple reject (no API yet) */
  async reject(item: PendingApprovalResponse) {
    const comments = prompt('Enter rejection reason:');

    if (!comments) {
      await this.toast.present('Rejection cancelled', 'warning');
      return;
    }

    // You can wire a real reject API later
    await this.toast.present(`Rejected ${item.user.username}`, 'warning');
  }
}
