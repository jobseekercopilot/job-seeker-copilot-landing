# ADR: privacy-focused launch analytics and monitoring

- Status: Accepted for implementation
- Date: 22 July 2026
- Decision owner: Landing Website / Bernard McGeever
- Tracking: [MONITORING-01 #50](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/50)

## Context and decision drivers

The launch needs useful acquisition, page, waiting-list and contact funnel
counts alongside the operational signals already built for API Gateway,
Lambda, DynamoDB and SES. It does not need advertising attribution, individual
browsing histories, cross-site tracking, fingerprinting or a unique-person
count. The pre-deployment implementation must remain off until privacy review
and the controlled production procedure authorise it.

This is an engineering privacy decision, not legal certification. The owner
must obtain a focused privacy/legal review before broad public marketing or any
material expansion of events, retention, providers or purposes.

## Options considered

| Option | Cost and free use | Storage, choice and data | Retention/transfers | Performance and reporting | Lock-in / decision |
| --- | --- | --- | --- | --- | --- |
| Privacy-focused hosted aggregate analytics (Plausible) | A paid external service; its published plans do not offer a permanent free plan. | Designed without cookies or persistent identifiers, but still introduces another processor and requires an appropriate notice/choice assessment. | Provider-controlled hosting and retention require review. | Small client impact and strong page/source dashboards; limited backend-outcome correlation without integration. | Easy to adopt, but external product/query model and recurring purchase. Not selected without purchase approval. |
| Google Analytics 4 | No direct product fee for standard use. | Uses analytics browser storage/cookies and adds consent-mode, property, access and collection choices. More data and configuration than this launch needs. | Configurable data retention, Google processing and transfer questions require review. | Mature acquisition/funnel reporting, but more browser and governance overhead. | High ecosystem coupling and unnecessary advertising-adjacent complexity. Not selected. |
| First-party events on the existing AWS stack | Usage-based Lambda, API Gateway, CloudWatch logs/metrics and alarms; no new product purchase. Existing budget alerts remain the cost guardrail. | Full control: explicit opt-in, no visitor ID, no raw referrer, controlled labels, 30-day logs, least-privilege log-only Lambda. | Existing AWS account and deployed UK Region; 30-day event-log retention. | One small request per accepted event; backend metrics represent real DynamoDB/SES outcomes. Founder reporting uses the existing dashboard and bounded Logs Insights queries. | Some AWS/CloudWatch coupling and more implementation work, but the smallest provider surface. Selected. |
| Search Console plus existing AWS operational metrics only | No new paid analytics service. | Search Console covers Google search; AWS metrics cover system outcomes with no browser events. | Existing provider arrangements. | Cannot explain direct/social/email acquisition, public-page use or form-view drop-off. | Low complexity but does not meet the launch funnel objective alone. Not sufficient. |
| Minimal combination | First-party opt-in events + existing AWS operational metrics + Search Console after approved deployment. | Browser layer remains optional and bounded; backend and search outcomes stay authoritative in their own layers. | No new provider beyond the existing AWS and approved Google Search Console use. | Covers page/source/form views, true backend conversions, search visibility and service health without visitor profiles. | Selected architecture. |

Sources reviewed: [Plausible security and data practices](https://plausible.io/security),
[Plausible plan position](https://plausible.io/contact),
[Google Analytics cookie usage](https://support.google.com/analytics/answer/11397207),
[Google consent settings](https://support.google.com/analytics/answer/12334711),
[Google Analytics retention](https://support.google.com/analytics/answer/7667196),
[AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/),
[CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/) and
[Search Console Core Web Vitals](https://support.google.com/webmasters/answer/9205520).
Published prices and product terms must be rechecked before a future purchase
or architecture change.

## Decision

Implement three separate layers:

1. Google Search Console preparation now, with ownership verification, sitemap
   submission and live URL inspection deferred to RELEASE-02 after both
   production journeys pass and indexing is approved.
2. A first-party, explicit-opt-in frontend collector using the existing HTTP
   API and a log-only Lambda. It accepts only enumerated events, public paths,
   controlled campaign labels, coarse acquisition and viewport categories, and
   production/smoke traffic classes.
3. Existing AWS operational metrics, extended with true waiting-list and
   contact conversion outcomes emitted only after successful DynamoDB or SES
   operations.

The design deliberately does not collect a visitor identifier, raw referrer,
full URL, query string, IP address, user-agent value, country, name, email,
message, confirmation token or arbitrary campaign value. A `visit` is counted
once per consenting browser tab using a boolean session marker; it is not a
unique-person metric. Country is omitted because it is not justified for the
launch objective and would add processing and reporting risk.

Both sides fail closed. `ENABLE_ANALYTICS` and the CloudFormation
`EnableAnalyticsCollection` parameter default to `false`. The frontend policy
permits activation only on `main`, production, the exact canonical `www` host
and a query-free HTTPS `/analytics` endpoint. Consent is still required after
those gates pass.

## Consequences and review triggers

- The website works fully after refusal or collector failure.
- Campaign reporting is intentionally less flexible: new values need a code,
  test, privacy and documentation review.
- CloudWatch Logs Insights supplies top-page/source reports; the small dashboard
  carries funnel and health totals. No raw log export is a reporting workflow.
- Search Console remains the source for Google impressions, clicks, position,
  indexed pages, crawl issues and field Core Web Vitals.
- Reconsider the ADR before adding a vendor, cookie, identifier, country,
  longer retention, advertising use, user-level export or material event.

Implementation and operator detail is in
[privacy-focused analytics and reporting](./privacy-focused-analytics-and-reporting.md).
