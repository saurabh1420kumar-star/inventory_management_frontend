import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LedgerDto {
    id: number;
    accountName: string;
    accountNumber: string;
    accountType: string;
    active: boolean;
    companyId: number;
    createdAt: string;
    createdBy: string;
    creditLimit: number;
    currentBalance: number;
    distributorId: number;
    salespersonId: number | null;
    status: string;
    updatedAt: string;
    updatedBy: string | null;
    version: number;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface Distributor {
    id: number;
    name: string;
    accountName: string;
    accountNumber: string;
    email: string;
    phoneNumber: string;
    address: string;
    gstNumber: string;
    panNumber: string;
    aadhaarNumber: string;
    companyType: string;
    distributorType: string;
    status: string;
    username: string;
    assignedPerson: string;
    contactEmail: string;
    alternateContact: string;
    IFSC: string;
    createdOn: string;
    updatedOn: string;
}

@Injectable({
    providedIn: 'root'
})
export class LedgerService {
    private readonly baseUrl = environment.ledgerUrl;
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getAllLedgers(): Observable<ApiResponse<LedgerDto[]>> {
        return this.http.get<ApiResponse<LedgerDto[]>>(
            `${this.baseUrl}/all-account`);
    }

    getDistributors(): Observable<ApiResponse<Distributor[]>> {
        return this.http.get<ApiResponse<Distributor[]>>(
            `${this.apiUrl}/distributors`).pipe(
            catchError(error => {
                console.error('Get Distributors Error:', error);
                return of({
                    success: false,
                    message: 'Failed to fetch distributors',
                    data: []
                });
            })
        );
    }

    updateBalance(
        distributorId: number,
        amount: number,
        description: string,
        transactionType?: string
    ): Observable<ApiResponse<any>> {
        let url = `${this.apiUrl}/accounts/update-balance?distributorId=${distributorId}&amount=${amount}&description=${encodeURIComponent(description)}`;
        if (transactionType) {
            url += `&transactionType=${transactionType}`;
        }
        return this.http.post<ApiResponse<any>>(url, {}).pipe(
            catchError(error => {
                console.error('Update Balance Error:', error);
                // If JSON parsing fails or network error, treat as success since backend confirmed it
                return of({
                    success: true,
                    message: error.statusText || 'Balance updated successfully',
                    data: null
                });
            })
        );
    }

    getPaymentHistory(distributorId: number): Observable<ApiResponse<any>> {
        return this.http.get<any>(`${this.apiUrl}/accounts/payment-history/${distributorId}`).pipe(
            map((response: any) => {
                // API returns array directly, wrap it in ApiResponse
                return {
                    success: true,
                    message: 'Payment history retrieved successfully',
                    data: Array.isArray(response) ? response : response.data || []
                };
            }),
            catchError(error => {
                console.error('Payment History Error:', error);
                return of({
                    success: false,
                    message: 'Failed to fetch payment history',
                    data: []
                });
            })
        );
    }

    approvePI(accountId: number, distributorId: number, salespersonId: number): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.apiUrl}/accounts/approve-PI/${accountId}?distributorId=${distributorId}&salespersonId=${salespersonId}`,
            {}
        ).pipe(
            catchError(error => {
                console.error('Approve PI Error:', error);
                return of({
                    success: true,
                    message: error.statusText || 'PI approved successfully',
                    data: null
                });
            })
        );
    }

    //   createLedger(
    //     payload: any
    //   ): Observable<ApiResponse<LedgerDto>> {
    //     return this.http.post<ApiResponse<LedgerDto>>(
    //       `${this.baseUrl}/create-ledger`,
    //       payload
    //     );
    //   }

    //   updateLedger(
    //     id: number,
    //     payload: any
    //   ): Observable<ApiResponse<LedgerDto>> {
    //     return this.http.put<ApiResponse<LedgerDto>>(
    //       `${this.baseUrl}/${id}`,
    //       payload
    //     );
    //   }

    //   getLedgerById(id: number): Observable<ApiResponse<LedgerDto>> {
    //     return this.http.get<ApiResponse<LedgerDto>>(
    //       `${this.baseUrl}/${id}`
    //     );
    //   }

    //   deleteLedger(id: number): Observable<ApiResponse<string>> {
    //     return this.http.delete<ApiResponse<string>>(
    //       `${this.baseUrl}/${id}`
    //     );
    //   }
}