import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';

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
  | { status: 'backend-disabled' };

@Injectable({ providedIn: 'root' })
export class EmailSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

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
}
