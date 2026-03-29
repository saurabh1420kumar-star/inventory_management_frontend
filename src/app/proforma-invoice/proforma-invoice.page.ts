import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonBadge
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { ProformaInvoiceService, ProformaInvoice } from '../services/proforma-invoice.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';
import { addIcons } from 'ionicons';
import { 
  download as downloadIcon, 
  checkmark as checkmarkIcon,
  eyeOffOutline as eyeOffIcon,
  closeCircleOutline as closeCircleIcon,
  checkmarkCircleOutline as checkmarkCircleIcon
} from 'ionicons/icons';

@Component({
  selector: 'app-proforma-invoice',
  standalone: true,
  templateUrl: './proforma-invoice.page.html',
  styleUrls: ['./proforma-invoice.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class ProformaInvoicePage implements OnInit {
  invoices: ProformaInvoice[] = [];
  filteredInvoices: ProformaInvoice[] = [];
  activeTab: 'all' | 'paid' | 'pending' = 'all';
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  downloadingId: number | null = null;
  expandedInvoiceId: number | null = null; // Track which invoice details are expanded
  loadingDetailsId: number | null = null; // Track which invoice details are loading
  downloadIdentifier: 'id' | 'cartId' | 'piNumber' = 'cartId'; // Toggle between id, cartId, or piNumber for download
  viewingPdfUrl: SafeResourceUrl | null = null; // Track safe PDF URL being viewed
  rawPdfUrl: string | null = null; // Store the raw URL for download link

  // Icon properties for template
  downloadIcon = downloadIcon;
  checkmarkIcon = checkmarkIcon;

  get paidCount(): number {
    return this.invoices.filter(inv => inv.paymentStatus === 'PAID').length;
  }

  get pendingCount(): number {
    return this.invoices.filter(inv => inv.paymentStatus === 'PENDING').length;
  }

  private haptic = inject(HapticService);

  constructor(
    private proformaInvoiceService: ProformaInvoiceService,
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private toast: Toast
  ) {
    addIcons({ downloadIcon, checkmarkIcon, eyeOffIcon, closeCircleIcon, checkmarkCircleIcon });
  }

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.isLoading = true;
    this.errorMessage = '';

    this.proformaInvoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.invoices = data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.filterInvoices();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.errorMessage = 'Failed to load invoices. Please try again.';
        this.isLoading = false;
        this.showToast('Error loading invoices', 'danger');
      }
    });
  }

  onSegmentChange(event: any) {
    this.haptic.selectionChanged();
    this.activeTab = event.detail.value;
    this.filterInvoices();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterInvoices();
  }

  filterInvoices() {
    let filtered = this.invoices;

    // Filter by tab
    if (this.activeTab === 'paid') {
      filtered = filtered.filter(inv => inv.paymentStatus === 'PAID');
    } else if (this.activeTab === 'pending') {
      filtered = filtered.filter(inv => inv.paymentStatus === 'PENDING');
    }

    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(inv =>
        inv.piNumber.toLowerCase().includes(this.searchTerm) ||
        inv.cartId.toString().includes(this.searchTerm) ||
        inv.distributorId.toString().includes(this.searchTerm) ||
        inv.amount.toString().includes(this.searchTerm)
      );
    }

    this.filteredInvoices = filtered;
  }

  downloadPdf(invoice: ProformaInvoice) {
    this.haptic.medium();
    if (invoice.paymentStatus !== 'PAID') {
      this.showToast('Only paid invoices can be downloaded', 'warning');
      return;
    }

    // Check if PDF is available
    if (!invoice.hasPdf) {
      this.showToast('PDF not available for this invoice yet', 'warning');
      return;
    }

    this.downloadingId = invoice.id;

    // If pdfUrl exists, download directly from the URL
    if (invoice.pdfUrl) {
      this.downloadFromUrl(invoice.pdfUrl, `${invoice.piNumber}.pdf`);
      this.downloadingId = null;
      return;
    }

    // Fallback: try to download from API endpoint
    this.proformaInvoiceService.downloadInvoicePdf(invoice.cartId).subscribe({
      next: (blob) => {
        this.downloadFromBlob(blob, `${invoice.piNumber}.pdf`);
        this.downloadingId = null;
        this.showToast('PDF downloaded successfully', 'success');
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.downloadingId = null;
        
        // Provide specific error messages
        if (error.status === 404) {
          this.showToast('PDF file not found on server. Please try again later.', 'danger');
        } else if (error.status === 403) {
          this.showToast('You do not have permission to download this PDF', 'danger');
        } else {
          this.showToast('Failed to download PDF. Please try again.', 'danger');
        }
      }
    });
  }

  private downloadFromBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private downloadFromUrl(pdfUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.target = '_blank';
    link.click();
    this.showToast('PDF downloaded successfully', 'success');
  }

  viewPdfModal(pdfUrl: string | null) {
    this.haptic.light();
    if (!pdfUrl) {
      this.showToast('PDF URL not available', 'warning');
      return;
    }
    this.rawPdfUrl = pdfUrl;
    this.viewingPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }

  closePdfModal() {
    this.haptic.light();
    this.viewingPdfUrl = null;
    this.rawPdfUrl = null;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  private async showToast(message: string, color: string = 'dark') {
    const mapped: 'success' | 'danger' | 'warning' =
      color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'success';
    await this.toast.present(message, mapped);
  }

  refresh() {
    this.loadInvoices();
  }

  toggleInvoiceDetails(invoiceId: number) {
    this.haptic.light();
    // If clicking the same invoice, collapse it
    if (this.expandedInvoiceId === invoiceId) {
      this.expandedInvoiceId = null;
      return;
    }

    // Just toggle the expanded state - we already have the data
    this.expandedInvoiceId = invoiceId;
  }
}
