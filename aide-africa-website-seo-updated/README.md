# AIDE Africa website

**Brand/legal identity:** AIDE Africa is the public-facing brand name of **Step and Steppers Foundation Africa Co. Limited**, a Uganda-registered company limited by guarantee (Reg. No. 80034855614881), incorporated on 4 April 2024 in Kampala, Uganda. Use AIDE Africa as the brand name and the registered company name wherever the legal entity must be identified.

A responsive, donor-focused NGO website starter with seven main navigation pages:

1. Home (`public/index.html`)
2. About Us (`public/about.html`)
3. Our Programs (`public/programs.html`)
4. Our Impact (`public/impact.html`)
5. Donate (`public/donate.html`)
6. Partner With Us (`public/partners.html`)
7. Contact (`public/contact.html`)

A separate privacy notice and payment-result utility pages are also included.

## Important status

**This site is not live and is not currently accepting donations.** The PayPal and Stripe routes are implemented as a starting point, but they will return an unconfigured message until you add credentials from approved payment accounts. The payment process must be tested end-to-end in sandbox/test mode and reviewed before going live. No successful live donation has been verified.

The contact form is currently a demo and does not deliver messages. No database, donor CRM, receipt email service, recurring donations, or complete accounting/reporting system is connected. The website logs verified Stripe completion events, but durable event storage and idempotent processing still need to be added before production.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Configure Stripe test mode

1. Create or sign in to the foundation's Stripe account and confirm that the legal entity and bank account are eligible for the intended country and currency.
2. Put the Stripe **test** secret key in `STRIPE_SECRET_KEY` in `.env`.
3. Use Stripe CLI or the Stripe dashboard to configure a webhook to `https://YOUR-DOMAIN/api/webhooks/stripe` and subscribe to `checkout.session.completed`.
4. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. Set `BASE_URL` to the public HTTPS domain used for the checkout return URLs.
6. Test successful payment, cancellation, failed payment, duplicate webhook delivery, and the confirmation email/receipt process before using live keys.

Do not expose secret keys in HTML, JavaScript, source control, or public hosting settings. Configure them as private environment variables in your hosting provider.

## Configure PayPal sandbox

1. Create a PayPal Developer app for sandbox testing.
2. Add its client ID and secret as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
3. Set `PAYPAL_MODE=sandbox` while testing.
4. For production, switch to live app credentials only after the organisation/account is approved and end-to-end checks pass; set `PAYPAL_MODE=live`.
5. Configure a PayPal webhook in the Developer Dashboard. The current starter does not yet include a PayPal webhook verification endpoint; add and test it before production reconciliation.

PayPal return/capture is implemented, but you must verify sandbox behavior and receipt workflows before launch.

## Deploy to Render or another Node host

- Create a **Web Service** from this repository or uploaded project (not a Static Site).
- Set **Root Directory** to blank / repository root when `package.json`, `server/`, and `public/` are directly in the repository root. If those files are inside a subfolder, set Root Directory to that exact subfolder instead.
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health` (optional but recommended).
- Set `NODE_ENV=production` and `BASE_URL=https://aide-africa-website.onrender.com` in the service environment; update `BASE_URL` if your Render address changes. The included `render.yaml` contains a Blueprint configuration for this service.
- Set `BASE_URL` to the final HTTPS domain and set payment credentials as secret environment variables.
- Add a persistent database and email/receipt provider before launch if you need donor records, duplicate-safe webhook processing, automated PDF receipts, refunds, or financial reporting.
- Configure a custom domain and HTTPS.

Do not deploy as a static-only site if you want the server-side payment routes to work. A static host alone cannot run `server/server.js`.

## Before public launch checklist

- The supplied fact sheet identifies the legal entity as Step and Steppers Foundation Africa Co. Limited (Reg. No. 80034855614881), incorporated 4 April 2024 in Kampala, Uganda. Leadership listed: Sempija Michael (Founder & Executive Director), with board members Wandowo Dixson Khakoto, Sempala Micheal, Magoola Keneth, and Nassaazi Gloria. Verify spellings and approvals before launch.
- The supplied organisation fact sheet lists `stepup4youthsafrica@gmail.com`, `steppersafrica@gmail.com`, and +256 780 111 252 / +256 703 087 745 / +256 757 577 801 / +256 745 957 719. Confirm these are monitored before launch.
- Replace illustrative stock photography with properly licensed or consented photos; obtain guardian consent and follow child safeguarding requirements for images/stories involving children.
- Confirm which program activities are currently approved and active before promoting enrolment or soliciting restricted funding.
- The Impact page lists the organisation’s 2026–2030 targets (50,000+ people reached through awareness/education, 500 community mobilisation champions trained, and 10 districts covered). These are targets, not completed results; publish progress only when supported by records.
- Approve the privacy notice, cookie/analytics practices, donation terms, refund policy, safeguarding policy and any tax-deductibility language with appropriate advisers.
- Confirm payment-provider eligibility, settlement currencies, transaction fees and local compliance requirements.
- Test checkout and cancellation on desktop/mobile; verify payment status with the provider, not from a browser redirect alone.
- Add database-backed donation records, idempotent webhook processing, automatic receipts, operational alerts, backups and access controls.
- Test keyboard navigation, contrast, form validation, broken links, mobile layouts, performance and security headers.

## Design system

- Forest green: `#123D32`
- Gold: `#D9B96C`
- Ivory: `#F7F5EF`
- Charcoal: `#263238`

The website uses responsive HTML/CSS/JavaScript, with Express routes for server-side checkout creation. Render must use the project root directory containing `package.json`, `server/`, and `public/`; do not set the root directory to `public/`. Donor payment details are entered on hosted provider checkout pages, not collected by this website.

## SEO included in this package

- Page-specific SEO titles and meta descriptions for the main pages.
- Canonical URLs and Open Graph / Twitter link-preview metadata.
- Organization JSON-LD structured data on the homepage using the legal entity and contact details supplied in the organisation fact sheet.
- `public/robots.txt` and `public/sitemap.xml`.
- Utility pages (404, cancelled checkout and donation status) marked `noindex, nofollow`.

**Domain note:** Canonical URLs and sitemap URLs currently use `https://aide-africa-website.onrender.com`. When you connect your permanent custom domain, update these URLs in the HTML files, `robots.txt`, `sitemap.xml`, and the Organization structured data before submitting the new sitemap in Google Search Console. The included metadata helps search engines understand the site but does not guarantee rankings or indexing.

## International donor and partner readiness

The site presents AIDE Africa as the brand of Step and Steppers Foundation Africa Co. Limited. The Partnerships page is intended for NGOs, foundations, development agencies and corporate partners. Publish only verified achievements, approved annual reports, audited financial statements, safeguarding policies and funding credentials; do not describe planned targets as achieved results.
