# RECOCARE — installable PWA starter

A blue-and-white, mobile-first Progressive Web App for a South Bangalore healthcare-services marketplace. It includes patient and provider account paths, four service categories, provider applications, patient booking requests, and a manual admin review screen.

**This is an application source-code starter, not a live deployed service.** Real accounts and bookings require your own Supabase project and deployment. Provider names and live availability will only appear after genuine providers are onboarded and approved.

## Included

- React + TypeScript + Vite frontend
- Installable PWA manifest and automatic service-worker setup
- Patient and provider signup/sign-in
- Service discovery for:
  - Nursing / Home Nursing
  - Physiotherapy
  - Post-operative Care
  - Medical Equipment
- South Bangalore pilot localities: Jayanagar, JP Nagar, Banashankari, BTM Layout, Arekere, Hulimavu, Bannerghatta Road and Electronic City
- Provider application queue (manual approval)
- Booking request queue (manual admin approval)
- Supabase PostgreSQL schema and Row Level Security (RLS) policies

## 1. What you need

- A computer (Windows, macOS or Linux)
- Node.js 20 LTS or later
- A free Supabase account/project
- A free hosting account that supports static sites (for example, Cloudflare Pages or Netlify)
- Basic comfort copying commands. No paid software is required for local development.

The app is designed to run on Android and iPhone as an installable website/PWA. Publishing a native app in Google Play or Apple App Store is a separate later step and may involve fees and extra review.

## 2. Create the database

1. Create a Supabase project.
2. Open **SQL Editor → New query**.
3. Copy all of `supabase/schema.sql` into the editor and run it.
4. In **Authentication → URL Configuration**, add your local development URL and eventual deployed domain to the allowed redirect URLs.
5. For a pilot, decide whether email confirmation is enabled. If enabled, users must confirm their email before signing in.

### Create the first administrator

1. Sign up once in the app using the email that will own administration.
2. In Supabase, open **Authentication → Users**, locate that user and copy their UUID.
3. In SQL Editor, run (replace the placeholder):
   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'YOUR_AUTH_USER_UUID';
   ```
4. Sign out and sign back in. The Admin navigation item should appear.

Do not make public signups with the `admin` role. The schema blocks this through its insert policy.

## 3. Run locally

1. Extract this ZIP.
2. Open a terminal in the `recocare-pwa` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env.local`.
5. In Supabase, open **Project Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Publishable/anon key → `VITE_SUPABASE_ANON_KEY`
6. Paste those values into `.env.local`. Example:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```
7. Start the app:
   ```bash
   npm run dev
   ```
8. Open the local URL printed by Vite (usually `http://localhost:5173`).

The anon/publishable key is intended for browser use when RLS is correctly configured. **Never put the Supabase `service_role` secret in frontend code or `.env.local`.**

## 4. Deploy free static hosting

### Option A — Cloudflare Pages (recommended for a static PWA)

1. Create a GitHub repository and upload the extracted project.
2. In Cloudflare, choose **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Add environment variables in the Pages project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.
8. Copy the deployed HTTPS domain and add it in Supabase **Authentication → URL Configuration** as a site URL / allowed redirect URL.
9. Test signup, email confirmation, sign-in, provider application, booking submission and admin review.

Netlify can also host the `dist` folder as a static site. Add the same environment variables and build settings.

## 5. Install on phones

### Android (Chrome)
1. Open the deployed HTTPS website in Chrome.
2. Tap the browser menu (⋮).
3. Choose **Install app** or **Add to Home screen**.
4. Confirm. RECOCARE should appear like an app icon.

### iPhone (Safari)
1. Open the deployed HTTPS website in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Confirm the name and tap **Add**.

The app must be deployed over HTTPS for reliable PWA installation and service-worker support.

## 6. Manual operating workflow

1. Patient creates an account and submits a booking request.
2. Request is stored with `pending` status.
3. Admin signs in and reviews the request.
4. Admin marks it approved, completed or cancelled.
5. Provider submits a separate provider application.
6. Admin checks credentials, registrations, service area and references outside the app, then approves/rejects the listing.
7. Only approved provider listings appear in public service discovery.

**Important:** The current MVP admin approval marks a booking approved but does not yet assign a provider or send SMS/WhatsApp/email notifications. Coordinate confirmation manually by phone/WhatsApp until a properly consented notification integration is added.

## 7. Before accepting real patients

This is a marketplace software prototype, not a clinical system and not a substitute for legal, clinical, privacy or security review.

Before launch:
- Verify each provider's identity, qualifications, professional registration where applicable, establishment/agency permissions, insurance and references.
- Have a Karnataka healthcare lawyer review applicability of the Karnataka Private Medical Establishments Act and other rules for each service/provider type.
- Publish Terms of Use, Privacy Notice, cancellation/refund policy, provider agreement and grievance contact.
- Obtain clear consent for collecting contact details and booking information; define retention and deletion periods.
- Do not collect diagnoses, prescriptions, medical reports, Aadhaar, payment-card details or detailed clinical histories in this MVP. The notes field should contain only basic service logistics.
- Restrict admin access, use strong passwords and enable MFA for administrators.
- Test RLS policies with patient, provider, admin and logged-out accounts before launch.
- Set up backups, incident response, support coverage and a clear emergency disclaimer.
- Never present a booking request as a confirmed appointment until a human confirms provider availability.

## 8. Current MVP limitations / next development phase

Not included yet:
- Provider assignment to an approved booking
- In-app chat, payment gateway, invoices or refunds
- SMS / WhatsApp / email notification automation
- Document upload or clinical records
- Provider availability calendar
- Ratings, reviews and dispute resolution
- Admin audit log and advanced reporting
- Native iOS / Android store packages

These should be developed only after the pilot workflow, provider verification and privacy requirements are validated.
