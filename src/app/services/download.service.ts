import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  constructor(private toastController: ToastController) {}

  /**
   * Download a PDF from a Blob.
   * - On Android native: saves to Downloads folder and shows a toast.
   * - On web: triggers browser download via anchor click.
   */
  async downloadBlob(blob: Blob, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.saveBlobNative(blob, filename);
    } else {
      this.saveBlobWeb(blob, filename);
    }
  }

  /**
   * Download a PDF from a direct URL.
   * - On Android native: fetches the blob first, then saves to Downloads.
   * - On web: triggers browser download via anchor click.
   */
  async downloadUrl(pdfUrl: string, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        await this.saveBlobNative(blob, filename);
      } catch (err) {
        console.error('Error fetching PDF for native download:', err);
        await this.showToast('Failed to download PDF', 'danger');
      }
    } else {
      this.saveUrlWeb(pdfUrl, filename);
      await this.showToast('PDF downloaded successfully', 'success');
    }
  }

  // ── Private helpers ──────────────────────────────────

  private async saveBlobNative(blob: Blob, filename: string): Promise<void> {
    try {
      const base64 = await this.blobToBase64(blob);

      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      await this.showToast(`Saved to Documents: ${filename}`, 'success');
    } catch (err) {
      console.error('Error saving file on Android:', err);
      await this.showToast('Failed to save PDF to device', 'danger');
    }
  }

  private saveBlobWeb(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private saveUrlWeb(pdfUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // strip "data:...;base64," prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
