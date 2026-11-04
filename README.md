# Paramount invoices

A simple invoice book using your original fixed invoice layout. Edit invoice numbers, dates, recipients, delivery addresses and goods. Amounts and Indian rupee words calculate automatically. Save invoices, export PDFs, print, and download or restore JSON backups.

## Deploy on Vercel

1. Import `abdullahak07/mspara` into Vercel. Keep the Next.js preset, repository root, and default build settings. Node.js 24 is specified in package.json.
2. Create/connect an **Upstash Redis** database from the Vercel Marketplace. Use a dedicated database for this invoice book.
3. Add these environment variables to **Production** (and to Preview only if desired):
   - `APP_PASSWORD`: the password in the separately supplied private setup file. Minimum 16 characters. This is the app login password.
   - `INVOICE_TEMPLATE_KEY`: exact value from the same private setup file. Keep a safe copy; the original template cannot be decrypted without it.
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: values from Upstash. The Vercel integration aliases `KV_REST_API_URL` and `KV_REST_API_TOKEN` also work.
4. Deploy, then open the site and log in. If you add variables after deployment, redeploy.

Do not prefix secrets with NEXT_PUBLIC_ or commit your setup file. The invoice template (bank details and signature included) is AES-256-GCM encrypted in this public repository and decrypted only for authenticated requests. Login cookies expire after seven days; changing APP_PASSWORD signs out existing sessions. Use the generated strong password. This is a single-owner invoice book; anyone with the password can access and edit all invoices.

Invoice history persists in Redis, with version checks preventing one tab/device silently overwriting another. Preview deployments should use a separate Redis database if used for testing. Download backups regularly.

## Move invoices from the original app

Download **invoice backup** from the original hosted app, then use **Restore backup** in this deployment's footer. Existing cloud data is not transferred automatically. Restore replaces this deployment's invoice book after confirmation. A fresh database starts with the supplied invoice 16 and prepares invoice 17.

## Local development

Use Node.js 24. Run `npm ci`, copy `.env.example` to `.env.local`, fill in the four values above, then run `npm run dev`.

Checks: `npm test`, `npm run typecheck`, `npm run build`. Start the production build with `npm start`.

The bundled pdf-lib browser library is MIT licensed; see `public/pdf-lib.LICENSE.md`.
