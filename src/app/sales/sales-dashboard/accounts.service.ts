import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UpdateBalanceRequest {
  distributorId: number;
  amount: number;
  transactionType: 'CREDIT' | 'DEBIT';
  description: string;
}

export interface UpdateBalanceResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private readonly apiUrl: string;

  constructor(private readonly http: HttpClient) {
    this.apiUrl = `${environment.apiUrl}/accounts/update-balance`;
  }

  updateBalance(request: UpdateBalanceRequest): Observable<UpdateBalanceResponse> {
    const params = {
      distributorId: request.distributorId.toString(),
      amount: request.amount.toString(),
      transactionType: request.transactionType,
      description: request.description
    };

    return this.http.post<UpdateBalanceResponse>(this.apiUrl, {}, { params });
  }
}
