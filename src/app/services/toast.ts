import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, alertCircle, closeOutline } from 'ionicons/icons';

@Injectable({
  providedIn: 'root'
})
export class Toast {

  constructor(private toastController: ToastController) {
    addIcons({
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'alert-circle': alertCircle,
      'close-outline': closeOutline,
    });
  }

  async present(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const iconMap: Record<string, string> = {
      success: 'checkmark-circle',
      danger: 'close-circle',
      warning: 'alert-circle',
    };

    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      animated: false,
      cssClass: `modern-toast modern-toast-${color}`,
      icon: iconMap[color],
      buttons: [
        {
          icon: 'close-outline',
          role: 'cancel',
          side: 'end',
        }
      ]
    });

    await toast.present();
  }
}