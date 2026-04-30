import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentService } from '../sales-dashboard/payment.service';
import { Auth } from '../../services/auth';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  walletOutline,
  refreshOutline,
  receiptOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [CommonModule, IonicModule, HttpClientModule],
  templateUrl: './my-payments.page.html'
})
export class MyPaymentsPage implements OnInit, OnDestroy {
  payments: any[] = [];
  isLoading = false;
  salespersonId = 0;
  totalAmount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private paymentService: PaymentService,
    private auth: Auth
  ) {
    addIcons({ arrowBackOutline, walletOutline, refreshOutline, receiptOutline, checkmarkCircleOutline });
  }

  ngOnInit(): void {
    this.salespersonId = this.auth.getSalespersonId() ?? 0;
    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPayments(): void {
    this.isLoading = true;
    this.paymentService
      .getLedgerUpdatedPaymentsBySalesperson(this.salespersonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.payments = Array.isArray(response) ? response : response.data || [];
          this.totalAmount = this.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.isLoading = false;
          this.payments = [];
        }
      });
  }

  handlePullRefresh(event: any) {
    this.loadPayments();
    setTimeout(() => event.target.complete(), 1500);
  }

  goBack(): void {
    this.router.navigate(['/sales/sales-dashboard']);
  }
}
