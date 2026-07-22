import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AnalyticsService } from '../../analytics/analytics.service';
import { AnalyticsViewDirective } from '../../analytics/analytics-view.directive';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { normaliseWaitlistEmail, waitlistEmailValidator } from '../../services/waitlist-email';
import { ContactService, isContactBackendConfigured } from '../../services/contact.service';

type ContactFormState = 'idle' | 'sent' | 'backend-disabled' | 'error';

function normaliseSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function trimmedLength(minimum: number, maximum: number, singleLine = false): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = singleLine ? normaliseSingleLine(control.value ?? '') : (control.value ?? '').trim();
    if (value.length < minimum) return { minlength: true };
    if (value.length > maximum) return { maxlength: true };
    return null;
  };
}

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, RouterLink, AnalyticsViewDirective],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly contactService = inject(ContactService);
  private readonly analytics = inject(AnalyticsService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  private formStartedAt = Date.now();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [trimmedLength(1, 120, true)] }),
    email: new FormControl('', { nonNullable: true, validators: [waitlistEmailValidator] }),
    subject: new FormControl('', { nonNullable: true, validators: [trimmedLength(1, 160, true)] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [trimmedLength(10, this.config.contactMessageMaxLength)],
    }),
    website: new FormControl('', { nonNullable: true }),
  });
  protected readonly submitting = signal(false);
  protected readonly state = signal<ContactFormState>('idle');
  private readonly contactBackendConfigured = isContactBackendConfigured(this.config);
  protected readonly productionDisabled = !this.contactBackendConfigured &&
    this.config.environmentName === 'production';
  protected readonly developmentDisabled = !this.contactBackendConfigured &&
    this.config.environmentName === 'development';

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) return;

    const raw = this.form.getRawValue();
    this.form.patchValue({
      name: normaliseSingleLine(raw.name),
      email: normaliseWaitlistEmail(raw.email),
      subject: normaliseSingleLine(raw.subject),
      message: raw.message.trim(),
    }, { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    if (this.form.invalid) {
      this.state.set('idle');
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    if (raw.website !== '') {
      this.state.set('error');
      return;
    }

    this.analytics.track('contact_attempt', 'contact');
    const request = this.form.getRawValue();
    this.submitting.set(true);
    this.state.set('idle');
    this.form.disable({ emitEvent: false });
    this.contactService.send({
      ...request,
      formStartedAt: this.formStartedAt,
    }).pipe(
      finalize(() => {
        this.submitting.set(false);
        this.form.enable({ emitEvent: false });
      }),
    ).subscribe({
      next: result => {
        this.state.set(result.status);
        if (result.status === 'sent') {
          this.form.reset();
          this.formStartedAt = Date.now();
        }
      },
      error: () => this.state.set('error'),
    });
  }

  protected clearStatus(): void {
    if (!this.submitting()) this.state.set('idle');
  }

  protected announcementRole(): 'alert' | 'status' {
    return this.state() === 'error' ? 'alert' : 'status';
  }

  private focusFirstInvalidField(): void {
    const firstInvalid = [
      { control: this.form.controls.name, selector: '#contact-name' },
      { control: this.form.controls.email, selector: '#contact-email' },
      { control: this.form.controls.subject, selector: '#contact-subject' },
      { control: this.form.controls.message, selector: '#contact-message' },
    ].find(({ control }) => control.invalid);
    this.host.nativeElement.querySelector<HTMLElement>(firstInvalid?.selector ?? '')?.focus();
  }
}
