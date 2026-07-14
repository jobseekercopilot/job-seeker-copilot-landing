import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';

interface WaitlistApiResponse {
  success: boolean;
  code: string;
  message: string;
}

export type WaitlistResult =
  | { status: 'joined' }
  | { status: 'duplicate' }
  | { status: 'validation-error' }
  | { status: 'backend-disabled' };

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  join(email: string): Observable<WaitlistResult> {
    const normalisedEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(normalisedEmail)) {
      throw new Error('A valid email address is required.');
    }
    if (!this.config.enableLiveSubmissions || !this.config.waitlistApiUrl.trim()) {
      return of({ status: 'backend-disabled' });
    }

    return this.http.post<WaitlistApiResponse>(this.config.waitlistApiUrl, { email: normalisedEmail }).pipe(
      map(response => {
        if (response.success === true && response.code === 'WAITLIST_CREATED') {
          return { status: 'joined' as const };
        }
        throw new Error('The waitlist API did not confirm persistence.');
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.code === 'EMAIL_ALREADY_REGISTERED') {
          return of({ status: 'duplicate' as const });
        }
        if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.code === 'INVALID_EMAIL') {
          return of({ status: 'validation-error' as const });
        }
        return throwError(() => error);
      }),
    );
  }

  private isValidEmail(email: string): boolean {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
