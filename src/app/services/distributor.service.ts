import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DistributorDto {
  id: number;
  name: string;
  assignedPerson: string;
  distributorType: string;
  companyType: string;
  contactEmail: string;
  phoneNumber: string;
  alternateContact?: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status: string;
  createdOn: string;
  updatedOn: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DistributorService {
  private readonly baseUrl = environment.distributorUrl;

  constructor(private http: HttpClient) {}

  getAllDistributors(): Observable<ApiResponse<DistributorDto[]>> {
    return this.http.get<ApiResponse<DistributorDto[]>>(
      this.baseUrl
    );
  }

  createDistributor(
    payload: any
  ): Observable<ApiResponse<DistributorDto>> {
    return this.http.post<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/create-distributor`,
      payload
    );
  }

  updateDistributor(
    id: number,
    payload: any
  ): Observable<ApiResponse<DistributorDto>> {
    return this.http.put<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/${id}`,
      payload
    );
  }

  getDistributorById(id: number): Observable<ApiResponse<DistributorDto>> {
    return this.http.get<ApiResponse<DistributorDto>>(
      `${this.baseUrl}/${id}`
    );
  }

  deleteDistributor(id: number): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.baseUrl}/${id}`
    );
  }

  getSalesPersons(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${environment.apiUrl}/hrmaster/salespersons`
    );
  }
}
