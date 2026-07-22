# Email Us frontend contract

The public `/contact` page collects only the fields required to route and reply
to a business enquiry. Sending a message does not join the visitor to the
waiting list and does not promise a response time.

## Field and request contract

| Field | Browser rule | Submitted value |
| --- | --- | --- |
| `name` | Required; 1–120 trimmed characters | Trimmed; repeated whitespace collapsed |
| `email` | Required; normalized valid address; max 254 characters | Trimmed and lowercase |
| `subject` | Required; 1–160 trimmed characters | Trimmed; repeated whitespace collapsed |
| `message` | Required; 10–3,000 trimmed characters by default | Leading/trailing whitespace removed; internal formatting preserved |

The request also carries the constant public source `landing-page`, the hidden
honeypot value, and the form-start timestamp needed by backend automation
controls. It contains no recipient address, credential, secret, or unsafe HTML.
The backend remains authoritative for field size, validation, abuse controls,
content escaping, delivery, and rate limits.

## UI state contract

- Invalid fields are marked and announced; focus moves to the first invalid
  field. Native form submission supports keyboard Enter.
- During submission, all controls are disabled, the form exposes
  `aria-busy=true`, and a polite live region announces secure sending. Repeated
  submit events cannot create a second request.
- Only `{success: true, code: "CONTACT_ACCEPTED"}` is success. The approved copy
  is: “Thanks for getting in touch. Your message has been sent.” The form resets
  only in that state.
- Validation, throttling, network, malformed-response, and provider failures all
  use the same generic copy. Backend codes/messages are neither rendered nor
  logged. Entered values remain available for a safe retry.
- Privacy wording explains the purpose and links to `/privacy`. On failure or a
  disabled production form, the fallback is the public company address
  `hello@jobseekercopilot.com`, never a personal mailbox.

At 600 CSS pixels and below, fields use one column and the submit button fills
the available width. Labels remain visible and controls retain their native
keyboard behavior.

## Runtime and release controls

`CONTACT_API_URL` is public runtime configuration, but the private contact
recipient is not. A production build with `ENABLE_LIVE_SUBMISSIONS=true` fails
closed unless the waitlist endpoints and `CONTACT_API_URL` are absolute HTTPS
URLs. The form also rejects a missing or insecure production contact endpoint
at runtime.

Static prerendering loads the same generated public configuration before
rendering. Production HTML therefore never contains the development-only
disconnected message, and a disabled production build includes the company
fallback even before browser hydration. The build verification checks this
against the copied runtime JSON.

Keep live submissions disabled until CONTACT-02 deploys the endpoint and
CONTACT-04 verifies controlled delivery and Reply-To behavior at the approved
company inbox. The fallback address is public contact information, not the
private backend recipient configuration.
