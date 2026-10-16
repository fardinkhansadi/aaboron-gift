# aaboron.uss Gift Box — free production starter

This project includes:
- Muted green/cream gift reveal page.
- Server-side 50/50 assignment of 5% or 10%.
- A unique claim URL per package.
- A unique coupon code created server-side and returned consistently if the same package QR is scanned again.
- An authenticated endpoint to create batches of claim URLs.
- An authenticated endpoint to validate and mark coupon codes as used.

## Important: use one unique QR per package
To limit rerolls, each package needs a different URL/token, so the QR artwork must be generated per package. A single shared QR can issue a fresh coupon to anyone who scans it and cannot reliably enforce one prize per package.

## Free hosting setup: Cloudflare Pages + D1
Free-plan features and limits can change; confirm them in Cloudflare before deployment.

1. Create a Cloudflare account and a GitHub account.
2. Upload the contents of this folder to a GitHub repository.
3. In Cloudflare, create a D1 database named `aaboron-gift-db`. Copy its database ID into `wrangler.toml` replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
4. In the D1 console, execute all SQL in `schema.sql`.
5. Create a Cloudflare Pages project connected to your repository. Set the build output directory to `public`. No build command is required.
6. In the Pages project settings, add an environment variable named `ADMIN_SECRET` with a long random secret value. Add it for Production (and Preview only if needed). Never put this secret in public HTML or share it.
7. Ensure the Pages D1 binding is named `DB` and points to your D1 database. In Pages → Settings → Functions → D1 database bindings, set variable name `DB`.
8. Deploy/redeploy the project. Your public site URL will be supplied by Cloudflare.

## Create unique claim URLs for packages
Use the browser developer console or an API client to send a POST to `https://YOUR-SITE.pages.dev/api/create-batch` with:
- Header `Authorization: Bearer YOUR_ADMIN_SECRET`
- Header `Content-Type: application/json`
- Body `{"count":20}` (choose 1–200)

Example using curl:
```bash
curl -X POST "https://YOUR-SITE.pages.dev/api/create-batch" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"count":20}'
```
The response contains unique URLs. Generate a separate QR code for each URL and put one into each package. Keep a record of which URL went into which package. Do not put the admin secret in a browser page or QR.

## Verify/redeem a customer's code
When the customer orders again, verify the code using a private admin tool/API client. Send:
```bash
curl -X POST "https://YOUR-SITE.pages.dev/api/redeem" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"code":"AAB-ABC123-DEF456"}'
```
The response tells you whether it is valid, its discount, and whether it has already been used. A valid code is marked used by the same request, so only call this when you are actually applying the discount.

## Test checklist
- Scan a claim URL: it reveals 5% or 10%.
- Reload/rescan the same URL: the same code and discount return.
- Open another claim URL: it gets a separate result.
- Redeem a code once: it succeeds.
- Redeem the same code again: it fails as already used.

## Security and business notes
- Keep `ADMIN_SECRET` private. If exposed, rotate it immediately.
- The code is checked server-side at redemption; don't honour a screenshot alone without verifying the code.
- A claim token is a bearer link: anyone who gets that package's URL can claim it. It is intended for the recipient, so don't publish claim URLs publicly.
- This starter has no admin dashboard or bulk QR image generator. Generate QR images from each returned URL using a QR generator, and test every print.
