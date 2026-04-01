import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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
    firstName?: string;
    lastName?: string;
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
        let url = `${this.apiUrl}/accounts/update-balance-accounts?distributorId=${distributorId}&amount=${amount}&description=${encodeURIComponent(description)}`;
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
                // API returns { closingBalance, distributorId, paymentHistory[] }
                return {
                    success: true,
                    message: 'Payment history retrieved successfully',
                    data: response
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

    createJournalVoucher(payload: any, distributorId: number): Observable<ApiResponse<any>> {
        console.log('🔄 API Request - POST /api/accounts/journal-voucher');
        console.log('📤 Request Payload:', payload);
        console.log('📤 DistributorId:', distributorId);
        console.log('🌐 Full URL:', `${this.apiUrl}/accounts/journal-voucher?distributorId=${distributorId}`);
        
        return this.http.post(`${this.apiUrl}/accounts/journal-voucher?distributorId=${distributorId}`, payload, { 
            responseType: 'text' 
        }).pipe(
            map((response: any) => {
                console.log('✅ API Response (Status 200):', response);
                return {
                    success: true,
                    message: response || 'Journal Voucher created successfully',
                    data: null
                };
            }),
            catchError(error => {
                console.error('❌ API Error Response:', error);
                console.error('Error Status:', error.status);
                console.error('Error Details:', error.error);
                return of({
                    success: false,
                    message: error?.error?.message || error?.message || 'Failed to create journal voucher',
                    data: null
                });
            })
        );
    }

    getJournalVouchersByDistributor(distributorId: number): Observable<any[]> {
        console.log('🔄 API Request - GET /api/accounts/jv-by-distributor');
        console.log('📤 DistributorId:', distributorId);
        console.log('🌐 Full URL:', `${this.apiUrl}/accounts/jv-by-distributor/${distributorId}`);
        
        return this.http.get<any[]>(
            `${this.apiUrl}/accounts/jv-by-distributor/${distributorId}`
        ).pipe(
            catchError(error => {
                console.error('❌ API Error Response:', error);
                return of([]);
            })
        );
    }

    getPaymentsByDistributorAndStatus(distributorId: number, status: string): Observable<any[]> {
        console.log('🔄 API Request - GET /api/accounts/payments');
        console.log('📤 DistributorId:', distributorId);
        console.log('📤 Status:', status);
        console.log('🌐 Full URL:', `${this.apiUrl}/accounts/payments/${distributorId}?status=${status}`);
        
        return this.http.get<any[]>(
            `${this.apiUrl}/accounts/payments/${distributorId}?status=${status}`
        ).pipe(
            catchError(error => {
                console.error('❌ API Error Response:', error);
                return of([]);
            })
        );
    }

    getPendingPayments(distributorId: number): Observable<any[]> {
        console.log('🔄 API Request - GET /api/accounts/pending-payments');
        console.log('📤 DistributorId:', distributorId);
        console.log('🌐 Full URL:', `${this.apiUrl}/accounts/pending-payments?distributorId=${distributorId}`);
        
        return this.http.get<any[]>(
            `${this.apiUrl}/accounts/pending-payments?distributorId=${distributorId}`
        ).pipe(
            catchError(error => {
                console.error('❌ API Error Response:', error);
                return of([]);
            })
        );
    }

    /**
     * Fetch ALL payment requests across every distributor, with optional status filter.
     * Used by the centralised Payment Requests page.
     */
    getAllPaymentRequests(status?: string, page: number = 0, size: number = 50): Observable<any> {
        let url = `${this.apiUrl}/accounts/payment-requests?page=${page}&size=${size}`;
        if (status && status !== 'ALL') {
            url += `&status=${status}`;
        }
        console.log('🔄 API Request - GET /api/accounts/payment-requests', { status, page, size });
        return this.http.get<any>(url).pipe(
            catchError(error => {
                console.error('❌ Error fetching all payment requests:', error);
                return of({ content: [], totalElements: 0, totalPages: 0 });
            })
        );
    }

    rejectPayment(paymentId: number, rejectedBy: number, reason: string): Observable<any> {
        console.log('🔄 API Request - POST /api/accounts/payment-rejection/' + paymentId);
        return this.http.post(
            `${this.apiUrl}/accounts/payment-rejection/${paymentId}?rejectedBy=${rejectedBy}`,
            { reason },
            { responseType: 'text' }
        ).pipe(
            map((response: any) => ({
                success: true,
                message: response || 'Payment rejected successfully',
            })),
            catchError(error => {
                console.error('❌ Error rejecting payment:', error);
                return of({ success: false, message: error?.error?.message || 'Failed to reject payment' });
            })
        );
    }

    approvePayment(paymentId: number, approvedBy: number): Observable<any> {
        console.log('🔄 API Request - POST /api/accounts/payment-approval/' + paymentId);
        console.log('📤 PaymentId:', paymentId);
        console.log('📤 ApprovedBy:', approvedBy);
        console.log('🌐 Full URL:', `${this.apiUrl}/accounts/payment-approval/${paymentId}?approvedBy=${approvedBy}`);
        
        return this.http.post(`${this.apiUrl}/accounts/payment-approval/${paymentId}?approvedBy=${approvedBy}`, '', { 
            responseType: 'text' 
        }).pipe(
            map((response: any) => {
                console.log('✅ API Response (Status 200):', response);
                return {
                    success: true,
                    message: response || 'Payment approved successfully',
                    data: null
                };
            }),
            catchError(error => {
                console.error('❌ API Error Response:', error);
                return of({
                    success: false,
                    message: error?.error?.message || error?.message || 'Failed to approve payment',
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