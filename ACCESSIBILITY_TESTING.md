# Accessibility testing and review

Accessibility is an ongoing development objective. This checklist supports review; it is not evidence of WCAG conformance or certification.

## Automated checks

Before a release:

1. run Angular lint, unit tests and the production build;
2. start the production build and run `npm run test:a11y`; the checked-in Playwright/axe-core scan covers the home, Privacy, Terms, Accessibility, Contact, confirmation and unsubscribe routes against selected WCAG 2 A/AA rules and fails on browser CSP violations;
3. review every result manually—automated tools find only some accessibility barriers;
4. record the tool/version, routes, date, findings, fixes and accepted follow-up work in the release record;
5. re-run tests after material content or component changes.

## Keyboard review

- Start at the address bar and navigate using Tab, Shift+Tab, Enter, Space, Escape and arrow keys where relevant.
- Confirm the skip link is the first page control and moves focus to the main content.
- Confirm every interactive element has a visible focus indicator and logical order.
- Open and use the mobile navigation without a pointer.
- Submit invalid and valid forms with the keyboard; ensure focus is not trapped or unexpectedly moved.
- Check at 200% and 400% zoom with no horizontal two-dimensional scrolling at common mobile widths.

## Screen-reader review

Test at least one current desktop screen reader/browser combination and, where possible, a mobile combination. Check landmarks, heading order, link purpose, source-link new-tab text, image alternatives, required fields, errors, character limits, loading states and status announcements. Do not infer screen-reader support from semantic markup alone.

## Visual and motion review

- Verify text and meaningful component contrast using a recognised contrast analyser.
- Check that information does not rely on colour alone.
- Enable reduced motion at operating-system level and confirm animations/transitions become negligible.
- Check browser text spacing overrides, high-contrast/forced-colour modes and responsive layouts.
- Verify the ONS statistic values, periods and sources remain readable without decoration.

## User feedback

Invite people with different access needs to test core tasks before and after beta. Record barriers without collecting unnecessary personal information, prioritise fixes by user impact and repeat testing when the affected workflow changes. Accessibility feedback is accepted through the Contact page.
