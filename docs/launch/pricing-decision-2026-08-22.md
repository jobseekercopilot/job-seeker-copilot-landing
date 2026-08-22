# Public-beta pricing decision — 22 August 2026

## Decision

Launch with the implemented non-renewing document-credit catalogue:

| Offer | Price | Documents | Understandable outcome |
| --- | ---: | ---: | --- |
| Free account allowance | £0 | 2 | One tailored CV and cover-letter pair |
| Starter | £7.99 | 10 | Up to 5 complete pairs |
| Active | £16.99 | 25 | Up to 12 pairs plus one document |
| Power | £34.99 | 60 | Up to 30 complete pairs |

Search, matching, profile management, application tracking, uploads, document
history, downloads and reporting are not divided into artificial paid feature
tiers. One successfully delivered CV or cover letter consumes one document
credit; failure, cancellation and replay do not consume a credit.

Do not describe these offers as subscriptions or promise an expiry policy that
has not been reviewed and versioned. Checkout stays disabled until seller,
legal, tax and Stripe release gates are explicitly approved.

## Why the proposed monthly tiers are not the launch catalogue

The proposed £4.99/10-pack, £11.99/30-pack and £19.99/75-pack monthly structure
is inexpensive to serve at established usage, but the current payment system is
deliberately a one-off Checkout and append-only credit ledger. A safe recurring
product additionally needs renewal, cancellation, failed-payment/dunning,
subscription-webhook ordering, entitlement-period rollover, receipts and
consumer-term behaviour. Adding those semantics immediately before launch
would turn the final Stripe credential step into a new payment project.

The monthly proposal should be reconsidered after the beta supplies observed
conversion, credit use, regeneration, support and churn data. It must not be
implemented merely by renaming one-off Stripe Prices as subscriptions.

## Measured AI cost

The configured model is `gpt-4.1-mini-2025-04-14`. The official OpenAI model
page lists $0.40 per million input tokens, $0.10 per million cached input tokens
and $1.60 per million output tokens.

Seventeen bounded product calls used 80,012 input and 23,419 output tokens and
cost $0.069487. The final measured CV-and-cover-letter operation made two calls,
used 13,729 input and 3,661 output tokens, and cost $0.011350.

| Unit | Low | Measured typical | Heavy sensitivity |
| --- | ---: | ---: | ---: |
| One complete CV + cover-letter pair | $0.00340 | $0.01135 | $0.02270 |
| One document, approximate half-pair allocation | $0.00170 | $0.00568 | $0.01135 |
| Starter maximum, 5 pairs | $0.0170 | $0.0568 | $0.1135 |
| Active maximum, 12.5 pair-equivalents | $0.0425 | $0.1419 | $0.2838 |
| Power maximum, 30 pairs | $0.1020 | $0.3405 | $0.6810 |

The per-document figure is an allocation, not a separately metered historical
result. The measured operation used one independently bounded call for each
document, but the retained cost ledger recorded the two-call total. Production
usage can be higher because of longer evidence, model changes and reviewed
regeneration.

## Payment overhead and fixed infrastructure

Stripe's UK standard-card list price is 1.5% + 20p. Before refunds, disputes,
tax and any currency conversion, that implies:

| Pack | Gross | Indicative Stripe fee | Net before other costs |
| --- | ---: | ---: | ---: |
| Starter | £7.99 | £0.32 | £7.67 |
| Active | £16.99 | £0.45 | £16.54 |
| Power | £34.99 | £0.72 | £34.27 |

The lean AWS plan is approximately $560/month, with a $750 alert ceiling, and
is the material early-stage cost. At 100, 500 and 2,000 monthly active users,
that fixed subtotal is $5.60, $1.12 and $0.28 per user respectively before
OpenAI, support and other variable services. The $1,000 Activate award covers
only about 1.8 months at the expected lean baseline, so credits are runway, not
evidence that the service is free to operate.

The current one-off catalogue therefore has adequate measured LLM headroom and
better low-volume fixed-cost protection than the proposed £4.99 entry
subscription. Pricing should still be reviewed after the first 30 and 90 days
of real use.

## Tax and human approvals

No VAT assumption is made by the browser. Before checkout is enabled, Bernard
must provide reviewed seller details and obtain appropriate UK tax/accounting
confirmation. The current intended configuration is
`NOT_VAT_REGISTERED` + `VAT_NOT_CHARGED`, but production remains fail-closed
until that status, legal-entity type, versioned consumer terms and seller
disclosures are explicitly configured and reviewed.

## Sources

- [OpenAI GPT-4.1 mini model pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [Stripe UK pricing](https://stripe.com/gb/pricing)
- Infrastructure evidence: `docs/aws-public-beta/cost-controls.md` and
  `docs/unit-economics-2026-08-11.md`
