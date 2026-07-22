import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { isValidWaitlistEmail, normaliseWaitlistEmail } from './waitlist-email';

interface WaitlistApiResponse {
  success: boolean;
  code: string;
  message: string;
}

export type WaitlistResult =
  | { status: 'pending-confirmation' }
  | { status: 'already-confirmed' }
  | { status: 'confirmation-required' }
  | { status: 'resubscription-required' }
  | { status: 'validation-error' }
  | { status: 'email-delivery-error' }
  | { status: 'rate-limited' }
  | { status: 'backend-disabled' };

@Injectable({ providedIn: 'root' })
export class WaitlistService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  join(email: string): Observable<WaitlistResult> {
    const normalisedEmail = normaliseWaitlistEmail(email);
    if (!isValidWaitlistEmail(normalisedEmail)) {
      throw new Error('A valid email address is required.');
    }
    if (!this.config.enableLiveSubmissions || !this.config.waitlistApiUrl.trim()) {
      return of({ status: 'backend-disabled' });
    }

    return this.http.post<WaitlistApiResponse>(this.config.waitlistApiUrl, { email: normalisedEmail }).pipe(
      map(response => {
        if (response.success !== true) throw new Error('The waitlist API did not accept the request.');
        if (response.code === 'WAITLIST_REQUEST_ACCEPTED') return { status: 'pending-confirmation' as const };
        if (response.code === 'WAITLIST_PENDING_CONFIRMATION') return { status: 'pending-confirmation' as const };
        if (response.code === 'WAITLIST_ALREADY_CONFIRMED') return { status: 'already-confirmed' as const };
        if (response.code === 'WAITLIST_CONFIRMATION_REQUIRED') return { status: 'confirmation-required' as const };
        if (response.code === 'WAITLIST_RESUBSCRIPTION_REQUIRED') return { status: 'resubscription-required' as const };
        throw new Error('The waitlist API did not confirm persistence.');
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.code === 'INVALID_EMAIL') {
          return of({ status: 'validation-error' as const });
        }
        if (error instanceof HttpErrorResponse && error.status === 429) {
          return of({ status: 'rate-limited' as const });
        }
        if (error instanceof HttpErrorResponse && error.error?.code === 'CONFIRMATION_EMAIL_TEMPORARILY_UNAVAILABLE') {
          return of({ status: 'email-delivery-error' as const });
        }
        return throwError(() => error);
      }),
    );
  }

}
