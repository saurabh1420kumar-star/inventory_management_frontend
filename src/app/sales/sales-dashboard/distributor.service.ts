import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Distributor {
  companyId: number;
  createdBy: string;
  createdOn: string;
  distributorId: number;
  distributorName: string;
  id: number;
  ledgerAccountId: number;
  salespersonId: number;
  salespersonName: string;
  status: string;
}

export interface DistributorResponse {
  success: boolean;
  message: string;
  data: Distributor[];
}

@Injectable({
  providedIn: 'root'
})
export class DistributorService {
  private apiUrl = 'https://api.imsnectarorigin.com/api/sales-mapping/salesperson';

  constructor(private http: HttpClient) { }

  getDistributorsBySalesperson(salespersonId: number | string): Observable<DistributorResponse> {
    return this.http.get<DistributorResponse>(`${this.apiUrl}/${salespersonId}`);
  }
}
