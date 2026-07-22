import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;
const LOCAL_PART_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function normaliseWaitlistEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidWaitlistEmail(value: string): boolean {
  const email = normaliseWaitlistEmail(value);
  if (!email || email.length > MAX_EMAIL_LENGTH || email.includes(' ') || email.split('@').length !== 2) {
    return false;
  }

  const [local, domain] = email.split('@');
  if (!local || local.length > MAX_LOCAL_PART_LENGTH || !LOCAL_PART_PATTERN.test(local) ||
      local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (!domain || domain.length > MAX_DOMAIN_LENGTH || !domain.includes('.')) {
    return false;
  }
  return domain.split('.').every(label => DOMAIN_LABEL_PATTERN.test(label));
}

export const waitlistEmailValidator: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => {
  const value = normaliseWaitlistEmail(control.value ?? '');
  if (!value) return { required: true };
  return isValidWaitlistEmail(value) ? null : { email: true };
};
