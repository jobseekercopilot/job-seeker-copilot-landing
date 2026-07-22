import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { PUBLIC_APP_CONFIG, PublicAppConfig } from '../config/public-app-config';

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
  formStartedAt: number;
}

interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
}

export type ContactResult = { status: 'sent' } | { status: 'backend-disabled' };

export function isContactBackendConfigured(config: PublicAppConfig): boolean {
  const endpoint = config.contactApiUrl.trim();
  if (!config.enableLiveSubmissions || !endpoint) return false;
  if (config.environmentName !== 'production') return true;
  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  send(request: ContactRequest): Observable<ContactResult> {
    if (!isContactBackendConfigured(this.config)) {
      return of({ status: 'backend-disabled' });
    }

    return this.http.post<ApiResponse>(this.config.contactApiUrl.trim(), {
      name: request.name.trim().replace(/\s+/g, ' '),
      email: request.email.trim().toLowerCase(),
      subject: request.subject.trim().replace(/\s+/g, ' '),
      message: request.message.trim(),
      source: 'landing-page',
      website: request.website,
      formStartedAt: request.formStartedAt,
    }).pipe(map(response => {
      if (response.success === true && response.code === 'CONTACT_ACCEPTED') {
        return { status: 'sent' as const };
      }
      throw new Error('The contact API did not accept the request.');
    }), catchError(() => throwError(() => new Error('Contact submission failed.'))));
  }
}
