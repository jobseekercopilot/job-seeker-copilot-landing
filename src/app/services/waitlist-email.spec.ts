import { FormControl } from '@angular/forms';
import { isValidWaitlistEmail, normaliseWaitlistEmail, waitlistEmailValidator } from './waitlist-email';

describe('waitlist email validation', () => {
  it('normalises the same way as the backend', () => {
    expect(normaliseWaitlistEmail('  PERSON@Example.COM ')).toBe('person@example.com');
  });

  it.each([
    'person@example.com',
    'first.last+launch@example.co.uk',
  ])('accepts %s', email => {
    expect(isValidWaitlistEmail(email)).toBe(true);
  });

  it.each([
    '',
    'not-an-email',
    '.person@example.com',
    'person..two@example.com',
    'person@-example.com',
    'person@example',
    `${'a'.repeat(65)}@example.com`,
  ])('rejects %s', email => {
    expect(isValidWaitlistEmail(email)).toBe(false);
  });

  it('validates the trimmed value while preserving required semantics', () => {
    const blank = new FormControl('   ', waitlistEmailValidator);
    const padded = new FormControl(' Person@Example.com ', waitlistEmailValidator);

    expect(blank.hasError('required')).toBe(true);
    expect(padded.valid).toBe(true);
  });
});
