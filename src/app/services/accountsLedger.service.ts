import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({
    providedIn: 'root'
})
export class LedgerService {
    private readonly baseUrl = environment.ledgerUrl;

    constructor(private http: HttpClient) { }

    getAllLedgers(): Observable<ApiResponse<LedgerDto[]>> {
        return this.http.get<ApiResponse<LedgerDto[]>>(
            `${this.baseUrl}/all-account`);
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