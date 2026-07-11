import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline, downloadOutline, documentTextOutline, constructOutline,
  checkmarkCircleOutline, closeCircleOutline, closeOutline, timeOutline,
  businessOutline, personOutline, cashOutline, cubeOutline, receiptOutline,
  refreshOutline, star, starOutline, chatbubbleEllipsesOutline, calendarOutline,
  checkmarkDoneOutline, pricetagOutline, cartOutline, peopleOutline,
} from 'ionicons/icons';

import { Observable } from 'rxjs';
import { Auth } from '../services/auth';
import { AclDirective } from '../acl/acl.directive';
import { HapticService } from '../services/haptic.service';
import { KeyboardService } from '../services/keyboard.service';
import {
  AdminApprovalService,
  InwardApproval,
  OrderConfirmation,
  SparePartApproval,
} from '../services/admin-approval.service';

type ApprovalTab = 'inward' | 'distributor-invoice' | 'spare-part';
type ApprovalKind = 'inward' | 'distributorInvoice' | 'sparePart';
type ActionMode = 'approve' | 'reject';

@Component({
  selector: 'app-hr-admin-approval',
  templateUrl: './hr-admin-approval.page.html',
  styleUrls: ['./hr-admin-approval.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, AclDirective],
})
export class HrAdminApprovalPage implements OnInit {

  /** Feature key used for CRUD button gating on this page. */
  readonly FEATURE = 'ADMIN_APPROVAL';

  readonly stars = [1, 2, 3, 4, 5];

  activeTab: ApprovalTab = 'inward';

  isLoadingInward = false;
  isLoadingInvoice = false;
  isLoadingSparePart = false;

  inwardApprovals: InwardApproval[] = [];
  distributorInvoiceApprovals: OrderConfirmation[] = [];
  sparePartApprovals: SparePartApproval[] = [];

  // ── Action modal (shared approve / reject, both carry a comment) ────
  showActionModal = false;
  actionMode: ActionMode = 'approve';
  actionKind: ApprovalKind | null = null;
  actionId: number | null = null;
  actionLabel = '';
  actionComment = '';
  isSubmittingAction = false;

  constructor(
    private readonly adminApprovalService: AdminApprovalService,
    private readonly auth: Auth,
    private readonly toastCtrl: ToastController,
    private readonly haptic: HapticService,
    private readonly keyboard: KeyboardService,
  ) {
    addIcons({
      shieldCheckmarkOutline, downloadOutline, documentTextOutline, constructOutline,
      checkmarkCircleOutline, closeCircleOutline, closeOutline, timeOutline,
      businessOutline, personOutline, cashOutline, cubeOutline, receiptOutline,
      refreshOutline, star, starOutline, chatbubbleEllipsesOutline, calendarOutline,
      checkmarkDoneOutline, pricetagOutline, cartOutline, peopleOutline,
    });
  }

  ngOnInit() {
    this.loadInward();
    this.loadDistributorInvoices();
    this.loadSpareParts();
  }

  switchTab(tab: ApprovalTab) {
    this.haptic.selectionChanged();
    this.activeTab = tab;
  }

  // ── Loaders ───────────────────────────────────────────────────────
  loadInward() {
    this.isLoadingInward = true;
    this.adminApprovalService.getInwardApprovals().subscribe({
      next: rows => { this.inwardApprovals = rows; this.isLoadingInward = false; },
      error: () => { this.isLoadingInward = false; this.toast('Failed to load inward approvals', 'danger'); },
    });
  }

  loadDistributorInvoices() {
    this.isLoadingInvoice = true;
    this.adminApprovalService.getDistributorInvoiceApprovals().subscribe({
      next: rows => { this.distributorInvoiceApprovals = rows; this.isLoadingInvoice = false; },
      error: () => { this.isLoadingInvoice = false; this.toast('Failed to load distributor invoices', 'danger'); },
    });
  }

  loadSpareParts() {
    this.isLoadingSparePart = true;
    this.adminApprovalService.getSparePartApprovals().subscribe({
      next: rows => { this.sparePartApprovals = rows; this.isLoadingSparePart = false; },
      error: () => { this.isLoadingSparePart = false; this.toast('Failed to load scrap outward approvals', 'danger'); },
    });
  }

  // ── Action modal (approve / reject) ───────────────────────────────
  openAction(mode: ActionMode, kind: ApprovalKind, id: number, label: string) {
    this.haptic.light();
    this.actionMode = mode;
    this.actionKind = kind;
    this.actionId = id;
    this.actionLabel = label;
    this.actionComment = '';
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
    this.actionKind = null;
    this.actionId = null;
  }

  get isActionInvalid(): boolean {
    // Reject requires a reason; approve comment is optional.
    return this.actionMode === 'reject' && !this.actionComment.trim();
  }

  submitAction() {
    if (!this.actionKind || this.actionId === null || this.isActionInvalid) {
      this.haptic.warning();
      return;
    }

    this.haptic.heavy();
    const id = this.actionId;
    const kind = this.actionKind;
    const mode = this.actionMode;
    const comment = this.actionComment.trim();
    const action: 'APPROVE' | 'REJECT' = mode === 'approve' ? 'APPROVE' : 'REJECT';

    this.isSubmittingAction = true;

    let request: Observable<unknown>;
    if (kind === 'inward') {
      request = this.adminApprovalService.processInward(id, action, comment, this.currentUserName());
    } else if (kind === 'distributorInvoice') {
      request = this.adminApprovalService.processOrderConfirmation(id, action, comment);
    } else {
      request = this.adminApprovalService.processSparePart(id, action, comment, this.currentUserName());
    }

    request.subscribe({
      next: () => {
        this.removeRow(kind, id);
        this.isSubmittingAction = false;
        this.closeActionModal();
        this.toast(mode === 'approve' ? 'Request approved' : 'Request rejected', mode === 'approve' ? 'success' : 'warning');
      },
      error: () => {
        this.isSubmittingAction = false;
        this.toast(`Failed to ${mode} request`, 'danger');
      },
    });
  }

  private removeRow(kind: ApprovalKind, id: number) {
    if (kind === 'inward') {
      this.inwardApprovals = this.inwardApprovals.filter(r => r.id !== id);
    } else if (kind === 'distributorInvoice') {
      this.distributorInvoiceApprovals = this.distributorInvoiceApprovals.filter(r => r.id !== id);
    } else {
      this.sparePartApprovals = this.sparePartApprovals.filter(r => r.id !== id);
    }
  }

  // ── View helpers ─────────────────────────────────────────────────
  inwardTitle(a: InwardApproval): string {
    return a._payload?.name || a.productCode || `Request #${a.id}`;
  }

  productTypeLabel(type?: string): string {
    switch (type) {
      case 'RAW_PRODUCT': return 'Raw Material';
      case 'FINISHED_PRODUCT': return 'Finished Product';
      case 'SPARE_PARTS': return 'Spare Parts';
      case 'PROMOTIONAL': return 'Promotional';
      default: return type || 'Inward';
    }
  }

  getInwardSummary(a: InwardApproval): { label: string; value: string }[] {
    const p = a._payload ?? {};
    const out: { label: string; value: string }[] = [];
    if (p.vendorName) out.push({ label: 'Vendor', value: String(p.vendorName) });
    if (p.quantity != null) out.push({ label: 'Quantity', value: `${p.quantity}${p.unit ? ' ' + p.unit : ''}` });
    const rate = p.rate ?? p.price;
    if (rate != null) out.push({ label: 'Rate', value: `₹ ${Number(rate).toLocaleString('en-IN')}` });
    if (p.grossAmount != null) out.push({ label: 'Gross Amount', value: `₹ ${Number(p.grossAmount).toLocaleString('en-IN')}` });
    if (p.invoiceNumber) out.push({ label: 'Invoice No', value: String(p.invoiceNumber) });
    if (p.batchNumber) out.push({ label: 'Batch No', value: String(p.batchNumber) });
    return out;
  }

  private currentUserName(): string {
    return this.auth.getUsername() || 'Admin';
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning') {
    // Notification haptic matches the toast intent (mirrors the shared Toast service).
    if (color === 'success') { this.haptic.success(); this.keyboard.dismiss(); }
    else if (color === 'warning') this.haptic.warning();
    else this.haptic.error();

    const t = await this.toastCtrl.create({ message, duration: 2200, color, position: 'top' });
    await t.present();
  }
}
