import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';

interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
}

export interface SubscriptionRequestMetadata {
  website: string;
  formStartedAt: number;
}

export type SubscriptionResult =
  | { status: 'pending-confirmation' }
  | { status: 'already-subscribed' }
  | { status: 'backend-disabled' };

export type WaitlistActionResult =
  | { status: 'confirmed' }
  | { status: 'already-confirmed' }
  | { status: 'unsubscribed' }
  | { status: 'already-unsubscribed' }
  | { status: 'resent' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'backend-disabled' };

@Injectable({ providedIn: 'root' })
export class EmailSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  subscribe(email: string, metadata: SubscriptionRequestMetadata): Observable<SubscriptionResult> {
    const normalisedEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(normalisedEmail)) {
      throw new Error('A valid email address is required.');
    }

    if (!this.isEnabled(this.config.waitlistApiUrl)) {
      return of({ status: 'backend-disabled' });
    }

    return this.http.post<ApiResponse>(this.config.waitlistApiUrl, {
      email: normalisedEmail,
      source: 'landing-page',
      consentVersion: this.config.consentVersion,
      website: metadata.website,
      formStartedAt: metadata.formStartedAt,
    }).pipe(map(response => ({
      status: response.code === 'ALREADY_SUBSCRIBED'
        ? 'already-subscribed'
        : 'pending-confirmation',
    })));
  }

  confirm(token: string): Observable<WaitlistActionResult> {
    return this.getAction(this.config.waitlistConfirmationApiUrl, token, response => {
      if (response.code === 'ALREADY_CONFIRMED') return 'already-confirmed';
      if (response.code === 'TOKEN_EXPIRED') return 'expired';
      if (response.code === 'INVALID_TOKEN') return 'invalid';
      return 'confirmed';
    });
  }

  resend(token: string): Observable<WaitlistActionResult> {
    if (!this.isEnabled(this.config.waitlistResendApiUrl)) {
      return of({ status: 'backend-disabled' });
    }
    return this.http.post<ApiResponse>(this.config.waitlistResendApiUrl, { token }).pipe(
      map(() => ({ status: 'resent' as const })),
    );
  }

  unsubscribe(token: string): Observable<WaitlistActionResult> {
    return this.getAction(this.config.waitlistUnsubscribeApiUrl, token, response => {
      if (response.code === 'ALREADY_UNSUBSCRIBED') return 'already-unsubscribed';
      if (response.code === 'TOKEN_EXPIRED') return 'expired';
      if (response.code === 'INVALID_TOKEN') return 'invalid';
      return 'unsubscribed';
    });
  }

  private getAction(
    endpoint: string,
    token: string,
    result: (response: ApiResponse) => WaitlistActionResult['status'],
  ): Observable<WaitlistActionResult> {
    if (!this.isEnabled(endpoint)) return of({ status: 'backend-disabled' });
    const params = new HttpParams().set('token', token);
    return this.http.get<ApiResponse>(endpoint, { params }).pipe(
      map(response => ({ status: result(response) } as WaitlistActionResult)),
    );
  }

  private isEnabled(endpoint: string): boolean {
    return this.config.enableLiveSubmissions && endpoint.trim().length > 0;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
