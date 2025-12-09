import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class Toast {

  constructor(private toastController: ToastController) {}

  async present(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
      cssClass: 'toast-right',
    });

    await toast.present();
  }
}