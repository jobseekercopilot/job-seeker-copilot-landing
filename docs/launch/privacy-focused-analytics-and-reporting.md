# Privacy-focused analytics and founder reporting

Tracking: [launch epic #8](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/8) and [MONITORING-01 #50](https://github.com/jobseekercopilot/job-seeker-copilot-landing/issues/50)

Use this guide with the
[architecture decision](./analytics-monitoring-architecture-decision.md),
[launch monitoring guide](./launch-monitoring-and-alarms.md) and
[Search Console runbook](./search-console-and-indexing.md). It does not
authorise production activation, indexing, a DNS change or a launch.

## Privacy and ownership boundary

Owner: **Landing Website / Bernard McGeever**. Frontend events describe an
opted-in browser action. Backend metrics describe a completed service outcome.
Never infer a backend conversion from a page view or neutral API response.

The event payload may contain only event name, approved public path, form
context, broad viewport, production/smoke traffic class, coarse acquisition
category and controlled campaign labels. It may not contain a name, address,
message, token, full URL/query, raw referrer, IP address, user-agent value,
visitor/session identifier, arbitrary form value or provider message ID.

The collector Lambda has log-only IAM, no DynamoDB or SES permission, a 30-day
log group and an independently false-by-default switch. API access logging omits
request bodies and source IPs. The website sends nothing before acceptance,
stores only the versioned choice in local storage, and stores only bounded
attribution plus a boolean one-visit marker in session storage. Refusal and
acceptance are equal controls; the footer reopens the choice. Analytics failure
must never block navigation or either form.

## Event catalogue

| Signal | Owner and exact emission point | Allowed context | Reporting metric |
| --- | --- | --- | --- |
| `visit` | Frontend, once per consenting browser tab after acceptance | Entry public path; no form context | `Analytics/Visits` (session proxy, not unique people) |
| `page_view` | Frontend, once per approved route transition after acceptance | Approved public path | `Analytics/PageViews` |
| `waitlist_form_view` | Frontend, first 25%-visible waitlist form after acceptance | `hero` or `footer` | `Analytics/WaitlistFormViews` |
| `waitlist_attempt` | Frontend, one valid intended submit before the HTTP request | `hero` or `footer` | `Analytics/WaitlistAttempts` |
| `contact_form_view` | Frontend, first 25%-visible contact form after acceptance | `/contact`, `contact` | `Analytics/ContactFormViews` |
| `contact_attempt` | Frontend, one valid intended submit before the HTTP request | `/contact`, `contact` | `Analytics/ContactAttempts` |
| `pricing_view` | Frontend, first 25%-visible pricing section after acceptance | `/`, `pricing` | `Analytics/PricingViews` |
| `pricing_cta` | Frontend, a deliberate pricing call-to-action click after acceptance | `/`, `pricing` | `Analytics/PricingCtaClicks` |
| Waitlist accepted | Submit Lambda, only after a new pending record and confirmation send succeed | No browser fields | `Waitlist/WaitlistAcceptedRequests` |
| Confirmation sent | Submit Lambda, same true new-delivery point | No browser fields | `Waitlist/WaitlistConfirmationSent` |
| Address confirmed | Confirm Lambda, only after the DynamoDB transaction succeeds | No token dimension | `Waitlist/WaitlistConfirmed` |
| Resend issued/failure | Resend Lambda at its actual send or failure point | No address dimension | Existing waitlist resend/failure metrics |
| Contact accepted | Contact Lambda, only after SES accepts the one non-duplicate send | No message/address dimension | `Contact/ContactAcceptedRequests` |
| Contact delivered/failed | Trusted SES event handler after exact purpose/configuration validation | No destination dimension | Existing contact SES metrics |

Repeated clicks while a request is active are ignored by each component.
Waitlist existing-state neutral responses, contact duplicate retries and failed
SES/DynamoDB operations do not emit a success conversion. Confirmation is
counted only after its transaction; contact delivery is counted only from the
trusted SES delivery event.

## Acquisition and UTM convention

Only these labels are accepted; any other value is discarded before the
request and rejected by the backend if submitted directly:

| Parameter | Approved values |
| --- | --- |
| `utm_source` | `direct`, `google`, `bing`, `linkedin`, `facebook`, `whatsapp`, `email`, `partner`, `other` |
| `utm_medium` | `direct`, `organic`, `social`, `email`, `referral`, `partner` |
| `utm_campaign` | `beta_launch`, `founder_update`, `launch`, `newsletter`, `partner_launch` |
| `utm_content` | `founder_post`, `homepage`, `profile`, `article`, `newsletter`, `message` |

Use lowercase labels and underscores. Never put a person's name, address,
company recipient, job application, message, token or private partner reference
in a UTM value. Add a future value only through a reviewed change to both
frontend and backend allowlists, tests, this catalogue and the privacy review.

Acquisition is reduced locally to `direct`, `search`, `social`, `email`,
`partner` or `other`. Known UTM source takes precedence; otherwise the browser
maps a known search/social referrer to the category and sends no referrer host
or path. Entry page is the path on `visit`.

## Environment and smoke separation

- Feature/develop/preview/test builds keep analytics disabled.
- Frontend `ENABLE_ANALYTICS` may resolve true only for `AWS_BRANCH=main`,
  `PUBLIC_ENVIRONMENT_NAME=production`, the exact canonical `www` URL and an
  approved query-free HTTPS endpoint.
- Backend `EnableAnalyticsCollection` defaults to `false` and is controlled only
  through a reviewed CloudFormation change set.
- An authorised production smoke uses only `analytics_test=smoke`. The client
  sends `TrafficClass=smoke`; ordinary traffic is `production`. Do not use a
  tester name, address or run ID.
- Automated tests use mocked HTTP/AWS clients. They do not call production.
- Confirmation, resend, unsubscribe and other action/token routes are not
  approved analytics paths. Their query values cannot enter an event.

## Funnels and interpretation

Use aggregate counts from one environment, traffic class and time window:

- visit-to-waitlist-accepted = `WaitlistAcceptedRequests / Visits`;
- form-view-to-waitlist-attempt = `WaitlistAttempts / WaitlistFormViews`;
- accepted-to-confirmed = `WaitlistConfirmed / WaitlistAcceptedRequests`;
- visit-to-confirmed = `WaitlistConfirmed / Visits`;
- resend rate = `ResendIssued / WaitlistAcceptedRequests`;
- waiting-list failure rate = relevant submit/send/confirmation failures divided
  by the matching attempts or accepted count;
- contact-view-to-attempt = `ContactAttempts / ContactFormViews`;
- contact acceptance rate = `ContactAcceptedRequests / ContactAttempts`;
- delivery success = `ContactSesDeliveries / ContactAcceptedRequests`;
- contact failure rate = contact validation/dependency/send/delivery failures
  divided by the matching attempt or accepted count.

Low counts can produce misleading percentages. Record the UTC window and raw
aggregate numerator/denominator, and never call `Visits` unique visitors.
SES bounce and complaint rates use trusted purpose-specific aggregate SES
counts, not frontend events.

## Founder dashboard and weekly report

Open CloudWatch in the approved company AWS account and `eu-west-2`, then use
the stack output `LaunchMonitoringDashboardName`. The small dashboard shows
alarms, API/Lambda health, waitlist/contact backend outcomes and the opted-in
production funnel. Search Console separately supplies impressions, clicks,
CTR, average position, top queries, indexed/excluded pages, crawl issues, links
and field Core Web Vitals after RELEASE-02 connects it.

For most-viewed pages and acquisition, run a bounded CloudWatch Logs Insights
query against only `/aws/lambda/JobSeekerCopilotLandingAnalytics`. Select the
smallest useful UTC window, return aggregate rows only and do not export raw
events:

```text
fields analytics.path, analytics.eventName, analytics.acquisition, analytics.trafficClass
| filter analytics.trafficClass = "production"
| filter analytics.eventName in ["visit", "page_view"]
| stats count(*) as total by analytics.eventName, analytics.path, analytics.acquisition
| sort total desc
| limit 50
```

Controlled campaign summary:

```text
fields analytics.campaign.source, analytics.campaign.medium, analytics.campaign.campaign, analytics.trafficClass
| filter analytics.trafficClass = "production"
| stats count(*) as events by analytics.campaign.source, analytics.campaign.medium, analytics.campaign.campaign
| sort events desc
| limit 50
```

The founder's weekly launch note should contain only: UTC window; opted-in
visits and page views; top approved paths/acquisition categories; waitlist
accepted/confirmed and rates; contact accepted/delivered and rates; Search
Console aggregates; alarm/API/email-failure totals; SES bounce/complaint totals;
and the account budget/service-cost summary. Do not attach raw logs or expose
notification destinations, addresses, content, tokens or request headers.

## Activation, disabling and incident response

MONITORING-01 stops at reviewed, merged, disabled code. RELEASE-02 owns live
activation after both production journeys, privacy approval and exact release
commit are ready:

1. Deploy the reviewed backend with collection still false and verify the new
   Lambda, 30-day log group, log-only role, dashboard and all 31 alarms.
2. Through a reviewed parameter-only change set, enable the backend collector.
3. Configure the public analytics endpoint but keep frontend analytics false;
   confirm no event arrives.
4. Enable frontend analytics on `main` only, load the canonical site with the
   smoke marker, refuse once and prove no request, then accept and perform one
   bounded page/waitlist/contact smoke.
5. Confirm only expected aggregate `smoke` events and true backend outcomes.
   Do not read mailbox or subscriber data for analytics verification.
6. Record redacted counts, return submission switches to their safe states and
   keep indexing disabled until its separate approval. The owner decides the
   intentional final analytics state.

To disable without breaking the website, set frontend `ENABLE_ANALYTICS=false`
and deploy, then set backend `EnableAnalyticsCollection=false` through a
reviewed change set. Do not remove the API, mutate Lambda variables directly,
delete logs, change consent storage or disable operational metrics. Existing
waitlist/contact journeys continue independently.

If funnel counts look wrong, first verify environment/traffic window, frontend
choice/config and the exact backend success point. For waiting-list failures use
the submit/confirmation/SES aggregate metrics; for contact use duplicate,
dedupe, send and trusted delivery metrics. Keep the affected submission switch
off when loss, duplication or misrouting is possible. Follow the
[operations runbook](./operations-and-troubleshooting-runbook.md) and preserve
only redacted evidence.
