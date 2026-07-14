import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';

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

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_APP_CONFIG);

  send(request: ContactRequest): Observable<ContactResult> {
    if (!this.config.enableLiveSubmissions || !this.config.contactApiUrl.trim()) {
      return of({ status: 'backend-disabled' });
    }

    return this.http.post<ApiResponse>(this.config.contactApiUrl, {
      name: request.name.trim(),
      email: request.email.trim().toLowerCase(),
      subject: request.subject.trim(),
      message: request.message.trim(),
      source: 'landing-page',
      website: request.website,
      formStartedAt: request.formStartedAt,
    }).pipe(map(() => ({ status: 'sent' as const })));
  }
}
