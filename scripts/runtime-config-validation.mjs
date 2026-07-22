export function validateLiveSubmissionConfig(value) {
  if (value.environmentName !== 'production' || !value.enableLiveSubmissions) return;

  const requiredEndpoints = [
    ['WAITLIST_API_URL', value.waitlistApiUrl],
    ['WAITLIST_CONFIRMATION_API_URL', value.waitlistConfirmationApiUrl],
    ['WAITLIST_RESEND_API_URL', value.waitlistResendApiUrl],
    ['CONTACT_API_URL', value.contactApiUrl],
  ];
  for (const [name, endpoint] of requiredEndpoints) {
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch {
      throw new Error(`${name} must be a valid absolute URL when production submissions are enabled.`);
    }
    if (parsed.protocol !== 'https:') {
      throw new Error(`${name} must use HTTPS when production submissions are enabled.`);
    }
  }
}
