import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { isValidWaitlistEmail, normaliseWaitlistEmail } from './waitlist-email';

interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
}

export type WaitlistActionResult =
  | { status: 'confirmed' }
  | { status: 'already-confirmed' }
  | { status: 'unsubscribed' }
  | { status: 'already-unsubscribed' }
  | { status: 'resent' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'validation-error' }
  | { status: 'rate-limited' }
  | { status: 'backend-disabled' };

@Injectable({ providedIn: 'root' })
export class EmailSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  confirm(token: string): Observable<WaitlistActionResult> {
    if (!this.isEnabled(this.config.waitlistConfirmationApiUrl)) return of({ status: 'backend-disabled' });
    return this.http.post<ApiResponse>(this.config.waitlistConfirmationApiUrl, { token }).pipe(
      map(response => {
        if (response.success && response.code === 'WAITLIST_CONFIRMED') return { status: 'confirmed' as const };
        if (response.success && response.code === 'WAITLIST_ALREADY_CONFIRMED') return { status: 'already-confirmed' as const };
        throw new Error('The confirmation API returned an unexpected result.');
      }),
      catchError(error => this.mapConfirmationError(error)),
    );
  }

  resend(email: string): Observable<WaitlistActionResult> {
    const normalisedEmail = normaliseWaitlistEmail(email);
    if (!isValidWaitlistEmail(normalisedEmail)) throw new Error('A valid email address is required.');
    if (!this.isEnabled(this.config.waitlistResendApiUrl)) return of({ status: 'backend-disabled' });
    return this.http.post<ApiResponse>(this.config.waitlistResendApiUrl, { email: normalisedEmail }).pipe(
      map(response => {
        if (response.success && response.code === 'WAITLIST_RESEND_ACCEPTED') return { status: 'resent' as const };
        throw new Error('The resend API returned an unexpected result.');
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.code === 'INVALID_EMAIL') {
          return of({ status: 'validation-error' as const });
        }
        if (error instanceof HttpErrorResponse && error.status === 429) {
          return of({ status: 'rate-limited' as const });
        }
        return throwError(() => error);
      }),
    );
  }

  unsubscribe(token: string): Observable<WaitlistActionResult> {
    if (!this.isEnabled(this.config.waitlistUnsubscribeApiUrl)) return of({ status: 'backend-disabled' });
    const params = new HttpParams().set('token', token);
    return this.http.get<ApiResponse>(this.config.waitlistUnsubscribeApiUrl, { params }).pipe(
      map(response => ({ status: response.code === 'ALREADY_UNSUBSCRIBED'
        ? 'already-unsubscribed' as const
        : 'unsubscribed' as const })),
    );
  }

  private mapConfirmationError(error: unknown): Observable<WaitlistActionResult> {
    if (error instanceof HttpErrorResponse) {
      if (error.error?.code === 'CONFIRMATION_TOKEN_EXPIRED') return of({ status: 'expired' });
      if (error.error?.code === 'CONFIRMATION_TOKEN_INVALID') return of({ status: 'invalid' });
      if (error.status === 429) return of({ status: 'rate-limited' });
    }
    return throwError(() => error);
  }

  private isEnabled(endpoint: string): boolean {
    return this.config.enableLiveSubmissions && endpoint.trim().length > 0;
  }
}
