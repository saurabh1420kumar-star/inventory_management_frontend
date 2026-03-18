import { Component, OnInit } from '@angular/core';
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
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { GdnService, GDN } from '../services/gdn.service';
import { Toast } from '../services/toast';
import { DownloadService } from '../services/download.service';
import { addIcons } from 'ionicons';
import { 
  download as downloadIcon, 
  eyeOffOutline as eyeOffIcon,
  closeCircleOutline as closeCircleIcon,
  checkmarkCircleOutline as checkmarkCircleIcon
} from 'ionicons/icons';

@Component({
  selector: 'app-gdn',
  standalone: true,
  templateUrl: './gdn.page.html',
  styleUrls: ['./gdn.page.scss'],
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
export class GdnPage implements OnInit {
  gdns: GDN[] = [];
  filteredGdns: GDN[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  downloadingId: number | null = null;
  expandedGdnId: number | null = null;
  viewingPdfUrl: SafeResourceUrl | null = null;
  rawPdfUrl: string | null = null;

  // Icon properties for template
  downloadIcon = downloadIcon;

  get totalCount(): number {
    return this.gdns.length;
  }

  constructor(
    private gdnService: GdnService,
    private toastController: ToastController,
    private sanitizer: DomSanitizer,
    private toast: Toast,
    private downloadService: DownloadService
  ) {
    addIcons({ downloadIcon, eyeOffIcon, closeCircleIcon, checkmarkCircleIcon });
  }

  ngOnInit() {
    this.loadGdns();
  }

  loadGdns() {
    this.isLoading = true;
    this.errorMessage = '';

    this.gdnService.getAllGdns().subscribe({
      next: (data) => {
        this.gdns = data.sort(
          (a, b) => new Date(b.gdnDate).getTime() - new Date(a.gdnDate).getTime()
        );
        this.filterGdns();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading GDNs:', error);
        this.errorMessage = 'Failed to load GDNs. Please try again.';
        this.isLoading = false;
        this.showToast('Error loading GDNs', 'danger');
      }
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterGdns();
  }

  filterGdns() {
    let filtered = this.gdns;

    // Filter by search term (GDN number or Order ID)
    if (this.searchTerm) {
      filtered = filtered.filter(gdn =>
        gdn.gdnNumber.toLowerCase().includes(this.searchTerm) ||
        gdn.orderId.toString().includes(this.searchTerm) ||
        gdn.gdnDate.toLowerCase().includes(this.searchTerm) ||
        gdn.transportName.toLowerCase().includes(this.searchTerm) ||
        gdn.driverName.toLowerCase().includes(this.searchTerm)
      );
    }

    this.filteredGdns = filtered;
  }

  downloadPdf(gdn: GDN) {
    // Check if PDF is available
    if (!gdn.hasPdf) {
      this.showToast('PDF not available for this GDN yet', 'warning');
      return;
    }

    this.downloadingId = gdn.id;

    // If pdfUrl exists, download directly from the URL
    if (gdn.pdfUrl) {
      this.downloadService.downloadUrl(gdn.pdfUrl, `${gdn.gdnNumber}.pdf`);
      this.downloadingId = null;
      return;
    }

    // Fallback: try to download from API endpoint
    this.gdnService.downloadGdnPdf(gdn.id).subscribe({
      next: async (blob) => {
        await this.downloadService.downloadBlob(blob, `${gdn.gdnNumber}.pdf`);
        this.downloadingId = null;
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.downloadingId = null;

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

  // downloadFromBlob and downloadFromUrl replaced by DownloadService

  toggleGdnDetails(gdnId: number) {
    if (this.expandedGdnId === gdnId) {
      this.expandedGdnId = null;
      return;
    }
    this.expandedGdnId = gdnId;
  }

  viewPdfModal(pdfUrl: string | null) {
    if (!pdfUrl) {
      this.showToast('PDF URL not available', 'warning');
      return;
    }
    this.rawPdfUrl = pdfUrl;
    this.viewingPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }

  closePdfModal() {
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

  private async showToast(message: string, color: string = 'dark') {
    const mapped: 'success' | 'danger' | 'warning' =
      color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'success';
    await this.toast.present(message, mapped);
  }

  refresh() {
    this.loadGdns();
  }
}

