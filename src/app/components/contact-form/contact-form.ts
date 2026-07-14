import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { ContactService } from '../../services/contact.service';

type ContactFormState = 'idle' | 'sent' | 'backend-disabled' | 'error';

function trimmedRequired(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length > 0 ? null : { trimmedRequired: true };
}

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly contactService = inject(ContactService);
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  private formStartedAt = Date.now();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, trimmedRequired, Validators.maxLength(120)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required, trimmedRequired, Validators.maxLength(160)] }),
    message: new FormControl('', { nonNullable: true, validators: [
      Validators.required, trimmedRequired, Validators.minLength(10), Validators.maxLength(this.config.contactMessageMaxLength),
    ] }),
    website: new FormControl('', { nonNullable: true }),
  });
  protected readonly submitting = signal(false);
  protected readonly state = signal<ContactFormState>('idle');
  protected readonly productionDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'production';
  protected readonly developmentDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'development';

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.state.set('idle');
    this.contactService.send({
      ...this.form.getRawValue(),
      formStartedAt: this.formStartedAt,
    }).pipe(
      finalize(() => this.submitting.set(false)),
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
}
