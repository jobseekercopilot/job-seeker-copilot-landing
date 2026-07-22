# Browser and API security policy

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [LANDING-SEC-01 #20](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/20)

## Approved origins and CORS

The deployed stack has two explicit modes:

| Mode | Browser origins allowed |
| --- | --- |
| Development | Exact develop Amplify hostname and the canonical `www` HTTPS origin |
| Production | Exact canonical `www` HTTPS origin only |

The apex site redirects to canonical `www` before Angular runs. The deleted
feature host, apex origin, lookalike subdomains, arbitrary origins, and even a
trailing-slash variation are not accepted by Lambda. Configuration parameters
also allow only an HTTPS origin without a path.

Preflight requires an approved `Origin` and returns only
`POST,OPTIONS`, `Content-Type`, and a 600-second max age. Invalid or missing
preflight origins receive a generic `403` without an
`Access-Control-Allow-Origin` header. Actual invalid-origin requests stop before
body parsing or data access. Responses never contain
`Access-Control-Allow-Credentials`, and there is no wildcard origin.

CORS is a browser response policy rather than authentication. The public forms
therefore retain server validation, API throttling, conditional writes and
contact abuse controls for direct non-browser requests.

## Hosting security headers

Amplify loads the repository-root `customHttp.yml` on deployment, as specified
by the [AWS Amplify custom-header procedure](https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html).
That file applies these headers to all hosted responses:

| Header | Policy |
| --- | --- |
| `Content-Security-Policy` | Same-origin resources, exact deployed API connection, no framing/plugins, self-only form/base/font/media/worker resources, and HTTPS upgrades |
| `Strict-Transport-Security` | One year with subdomains; deliberately not submitted for preload |
| `Referrer-Policy` | `no-referrer`, preventing confirmation/unsubscribe query tokens from becoming a Referer while Angular removes them |
| `Permissions-Policy` | Camera, microphone, location, payment, capture, sensors and other unused browser capabilities disabled |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY`, alongside CSP `frame-ancestors 'none'` |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-XSS-Protection` | `0`, disabling the obsolete browser filter in favor of CSP |

The public runtime configuration has a separate `no-store, max-age=0` rule so a
browser does not retain an earlier endpoint or submission-switch value.

The hosting CSP intentionally omits `default-src` and `script-src`. Every final
prerendered HTML file receives its own second CSP policy after the Angular
build: external scripts are same-origin only, every actual inline script is
covered by its exact SHA-256 hash, plugins are disabled, and the base URI is
restricted. Browser enforcement intersects the two policies. This preserves
route-specific structured data without allowing arbitrary inline script,
`unsafe-eval`, remote scripts, or inline event handlers. Angular's deferred
critical-CSS option is disabled because it emits an inline `onload` handler;
styles remain same-origin with the minimum required inline-style allowance for
prerendered component CSS.

This follows [Angular's CSP guidance](https://angular.dev/best-practices/security)
while accommodating the build's reported incompatibility between the automatic
CSP option and static SSR. The dedicated CSP step hashes the final SSR output
instead. Header selection also follows the
[OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).

## API response policy

Every Lambda JSON response and preflight response now includes fixed:

- `Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'`;
- one-year HSTS with subdomains;
- `Referrer-Policy: no-referrer`;
- a restrictive `Permissions-Policy`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`; and
- `X-Permitted-Cross-Domain-Policies: none`.

Responses remain `no-store` and vary on `Origin`. Error bodies expose only
stable public codes/messages. API access logs omit bodies, request headers,
query strings and source IPs. Application logs use fixed outcomes, request IDs,
count-only metrics and bounded AWS error categories/codes—never raw tokens,
contact content, recipient addresses, provider payloads or stack traces.

The deployed JSON parser accepts only `application/json`, decodes base64
strictly, requires an object, and rejects an empty or decoded body over 4 KiB.
Each handler then requires its exact field set and applies tighter field limits.
The secondary SAM design also has an explicit body limit. Its confirmation and
unsubscribe routes now accept POST JSON bodies rather than raw token query
parameters.

## Confirmation and unsubscribe token path

The approved waitlist sender creates HTTPS links under the canonical public
site. The browser reads the single-use token once, calls `replaceState` before
validation or network use, never renders it, clears the component field, and
POSTs it in a JSON body. The same POST-body rule applies to the future
unsubscribe API. The `no-referrer` hosting header prevents the initial landing
URL from being forwarded to subresources or outbound links.

The initial HTTPS document request necessarily contains the email-link query
token so the static application can receive it. CloudFront/Amplify logging must
therefore remain access-controlled and retention-limited; tokens must never be
copied into tickets or application logs. Confirmation tokens are bounded,
hashed before lookup, expire, and become single-use tombstones after successful
confirmation.

## Deployment and verification checklist

1. Build first; the build must inject and re-hash CSP after every prerender.
2. Fail if generated HTML contains `unsafe-inline` for scripts, `unsafe-eval`,
   an unmatched inline script, or an inline event handler.
3. If the API hostname changes, review and update the exact `connect-src` value
   in the same release. Never replace it with a wildcard.
4. Deploy the backend only through a reviewed CloudFormation change set; keep
   all NoEcho values and submission switches unchanged unless the release task
   explicitly changes them.
5. Deploy Amplify from the reviewed branch, then inspect canonical HTML, a
   confirmation route, runtime configuration and a static asset.
6. Verify all hosting headers, no-store runtime configuration, exact allowed
   CORS origins, rejected invalid/apex/trailing-slash origins, POST-only
   preflights, generic errors, and HTTPS callback behavior.
7. Run the production build in a real browser across every route and fail on
   any CSP console violation, page error, accessibility regression or token
   remaining in the visible URL/history state.
8. Keep frontend and contact-backend submissions disabled until the later E2E
   and production release tasks explicitly enable them.

Rollback the Amplify deployment and backend stack independently if their
policies diverge or required behavior breaks. A rollback must never restore a
wildcard/obsolete origin, query-string API token, raw-error logging or missing
security headers.
