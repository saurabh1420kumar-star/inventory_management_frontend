import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from 'src/environments/environment';

// Update User Request Interface (based on API documentation)
export interface UpdateUserRequest {
  username: string;
  email: string;
  status: string;
  firstName: string;
  lastName: string;
  contactNo: string;
  alternateContactNo?: string;
  bloodGroup?: string;
  completeAddress: string;
  city: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  zip: string;
  roleType: string;
}

// Update User Response Interface
export interface UpdateUserResponse {
  id?: number;
  message?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  constructor() { }

  /**
   * Fetch all users from the API
   * @returns Observable of User array
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.permissionsUrl}/all-users`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Assign role to user (Approve user by assigning role)
   * @param userId User ID
   * @param roleType Role type to assign
   * @returns Observable of text response
   */
  assignRoleToUser(userId: number, roleType: string): Observable<string> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('roleType', roleType);

    return this.http.post(
      `${environment.apiUrl}/admin/roles/assign-user`,
      null,
      { 
        params,
        responseType: 'text'
      }
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Update user information
   * @param userId User ID
   * @param userData User data to update
   * @returns Observable of User
   */
  updateUser(userId: number, userData: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(
      `${environment.permissionsUrl}/user_edit/${userId}`,
      userData
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Reject/Suspend user by user ID
   * @param userId User ID to reject/suspend
   * @returns Observable of any response
   */
  rejectUser(userId: number): Observable<any> {
    return this.http.delete<any>(
      `${environment.permissionsUrl}/user_suspend/${userId}`
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Delete user by user ID
   * @param userId User ID to delete
   * @returns Observable of any response
   */
  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(
      `${environment.permissionsUrl}/user_delete/${userId}`
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   * @param error HttpErrorResponse
   * @returns Error observable
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
