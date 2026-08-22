# Public-beta pricing decision — 22 August 2026

## Decision

Launch with the implemented non-renewing document-generation catalogue:

| Offer | Price | Documents | Understandable outcome |
| --- | ---: | ---: | --- |
| Free account allowance | £0 | 2 | One tailored CV and cover-letter pair |
| Starter | £4.99 | 10 | Up to 5 complete pairs |
| Active | £11.99 | 25 | Up to 12 pairs plus one document |
| Power | £19.99 | 60 | Up to 30 complete pairs |

Search, matching, profile management, application tracking, uploads, document
history, downloads and reporting are not divided into artificial paid feature
tiers. One successfully delivered CV or cover letter consumes one document
generation; failure, cancellation and replay do not consume a generation.

Do not describe these offers as subscriptions or promise an expiry policy that
has not been reviewed and versioned. Checkout stays disabled until seller,
legal, tax and Stripe release gates are explicitly approved.

These are one-off purchases, not monthly subscriptions. The lower launch
prices are economically supportable on measured variable cost and are helped
temporarily by the $1,000 AWS Activate award. The award is runway, not a reason
to hide the post-credit fixed-cost break-even point.

## Why the launch catalogue remains one-off

The target prices are used with the implemented 10/25/60-generation one-off packs.
The payment system is deliberately a one-off Checkout and append-only allowance
ledger. A safe recurring product additionally needs renewal, cancellation,
failed-payment/dunning, subscription-webhook ordering, entitlement-period
rollover, receipts and consumer-term behaviour. Changing that model immediately
before launch would turn the final Stripe credential step into a new payment
project.

The monthly proposal should be reconsidered after the beta supplies observed
conversion, allowance use, regeneration, support and churn data. It must not be
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
| Starter | £4.99 | £0.27 | £4.72 |
| Active | £11.99 | £0.38 | £11.61 |
| Power | £19.99 | £0.50 | £19.49 |

Stripe also lists a £20 dispute-received fee. If a deliberately adverse 1% of
payments were lost disputes, the expected per-sale exposure from that fee plus
the lost pack price would be about £0.25, £0.32 and £0.40 respectively. The
heavy-AI contributions would still be approximately £4.30, £10.86 and £18.07.
That does not justify raising the launch price, but disputes must be monitored
and the included Radar/3DS controls must remain enabled; this is not permission
to tolerate an elevated dispute rate.

The founding promotion can add 50% to the delivered generations, making the maximum
first-purchase allocations 15, 38 and 90 documents. The following sensitivity
uses the measured heavy AI case and, deliberately, treats every USD of AI cost
as one GBP rather than relying on a favourable exchange rate:

| Pack | Heavy AI, base generations | Heavy AI, founding allocation | Net contribution after Stripe and promoted AI at USD=GBP parity |
| --- | ---: | ---: | ---: |
| Starter | $0.1135 | $0.1703 | £4.55 |
| Active | $0.2838 | $0.4313 | £11.18 |
| Power | $0.6810 | $1.0215 | £18.47 |

This does not include support, tax, refunds, disputes or unknown future paid
search/location-provider charges. It does show that measured model consumption
does not require increasing the target prices. The bounded document-generation
allowance prevents open-ended generation liability.

The lean AWS plan is approximately $560/month, with a $750 alert ceiling, and
is the material early-stage cost. At 100, 500 and 2,000 monthly active users,
that fixed subtotal is $5.60, $1.12 and $0.28 per user respectively before
OpenAI, support and other variable services. The $1,000 Activate award covers
about 1.79 months at the currently proven lean baseline.

The smallest credible infrastructure saving is to benchmark an x86-64
`m6a.2xlarge` in place of `m7i.2xlarge`. The official AWS Price List snapshot
for London on 22 August quotes $0.39960/hour rather than $0.46620/hour while
retaining 8 vCPU and 32 GiB. That saves about $48.62 per 730-hour month, lowers
the planning total from roughly $560 to **$511**, and extends the $1,000 award
to about **1.96 months**. The checked-in release must retain `m7i.2xlarge`
until the alternative passes the existing full-image health, 29-task placement
and 1/5/10/15/20/25-user browser benchmark. The lower price is therefore not
being justified by an unproven infrastructure switch.

A deeper `r6a.xlarge` benchmark could retain 32 GiB while reducing the estimate
to about $414/month and extending the award to about 2.41 months, but it halves
compute to four vCPU and cannot currently satisfy the 6,528-unit application,
scanner, operator and host reservation envelope. It needs a measured CPU
reservation rebudget and the complete concurrency ladder; it is not assumed by
this pricing approval.

At the same conservative USD=GBP parity and after the worst-case founding AI
allocation, the monthly AWS baseline is covered by approximately 124 Starter,
51 Active or 31 Power purchases. A real sales mix will fall between those
points. The two-generation free allowance costs $0.0227 per account even at the
heavy sensitivity, or $11.35 for 500 fully used free allowances.

The £4.99/£11.99/£19.99 catalogue is therefore approved as an introductory
one-off launch catalogue without an upward adjustment. It is variable-cost
positive without Activate; Activate gives the product time to build enough
purchase volume to cover fixed infrastructure. Review pricing after 30 and 90
days, when the Activate balance approaches exhaustion, and whenever the model,
promotion, infrastructure shape or paid-provider contracts change.

AWS Activate currently also lists a Stripe for Startups offer with $500 in
credits to offset eligible Stripe product fees. Stripe says a startup offer
expires 12 months after activation or when its limit is reached, whichever is
first, and can be redeemed only once. It should therefore be activated only
when the live Stripe account is ready to process payments. The normal Stripe
fees remain in every calculation above; this conditional credit is additional
launch runway, not permanent unit-economics evidence.

At deliberately conservative USD=GBP parity, $500 would cover roughly 1,819
Starter, 1,316 Active or 1,000 Power standard-UK-card fees at the current list
rate. The real mix and exchange rate will differ, and Stripe must confirm which
fee categories the activated award offsets. Verify the applied balance under
Stripe Reports → Fee Credits before treating any fee as subsidised.

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
- [AWS Activate Stripe offer](https://startups.aws.com/offers/stripe)
- [Stripe Startups programme FAQ](https://support.stripe.com/questions/stripe-startups-program-faqs)
- [AWS public Price List API, Amazon EC2 in London](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/eu-west-2/index.json)
- Infrastructure evidence: `docs/aws-public-beta/cost-controls.md` and
  `docs/unit-economics-2026-08-11.md`
