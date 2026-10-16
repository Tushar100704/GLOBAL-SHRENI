# Global Shreni

Global Shreni connects digital talent, local professionals, artisans, businesses, and workers looking for short contracts.

## Run locally

Use Node.js 22.13 or later.

```sh
npm start
```

Open <http://127.0.0.1:3000>. Without `DATABASE_URL`, marketplace data is saved in `data/global-shreni.sqlite`; `npm run dev` restarts the server when files change.

## Deploy to Vercel

The live Vercel project uses Neon Postgres for persistent accounts, profiles, contracts, applications, bookings, and reviews. Vercel serves the site and routes `/api/*` to the serverless handler. Local SQLite data stays on the development machine and is intentionally excluded from deployments; local accounts do not automatically exist on the live site.

```sh
vercel link
vercel deploy --prod
```

For a second device on your local network, set `HOST=0.0.0.0` before starting and open the computer's local network address on that device. Do not expose the development server directly to the public internet.

## Included in this MVP

- Account creation and sign-in with password hashing and private session cookies.
- Optional Google sign-in with server-side Google ID-token verification and account linking by verified email.
- Shreni Guide AI chat, powered server-side by Gemini Flash with request limits and no chat-history storage.
- Worker profiles for remote, local, and hybrid work.
- Marketplace search ranked by category, matching skills, area, availability, and completed-work reviews.
- Service booking requests that workers can accept or decline; customers can mark accepted work complete and leave one review.
- Guild contracts with hours, location, pay, and worker count; workers apply and employers choose the crew.
- Near-live in-app updates for new contracts, applications, booking changes, and reviews, delivered through a persistent event feed and checked every 10 seconds.
- Responsive web interface, persistent SQLite storage, basic request limits, and security headers.

Worker ranking is rules-based and explainable. The category catalogue is illustrative; profiles and contracts come only from real account submissions.

## Optional Google sign-in and AI chat

Set `GOOGLE_CLIENT_ID` to a Google Identity Services web client ID. Add the deployed origin (`https://global-shreni.vercel.app`) to the OAuth client's authorized JavaScript origins. The server verifies every Google ID token; the client ID is public configuration, not a secret.

Create the Gemini API key in Google AI Studio and set `GEMINI_API_KEY` in the hosting provider's encrypted environment-variable settings. Keep billing disabled on the Google project to avoid paid usage; when free quotas run out, chat pauses until they reset. The key stays on the server. The app defaults to `gemini-3.8-flash`; set `GEMINI_MODEL` only when changing the model deliberately. Google's free tier has quotas and terms that can change, and free-tier prompts may be used to improve Google services. Chat text is not saved by this app; a keyed hash of the network address and a daily request count are retained for rate limiting. Users should not enter passwords, OTPs, payment information, or sensitive personal details.

## Before opening to the public

This is a deployable MVP, not a fully operated marketplace. It does not hold or process payments, verify identities, send email or SMS, provide password recovery, or include moderation and dispute handling. Payment terms are agreed directly between members. Do not describe profiles as identity-verified.

Before relying on the service for public transactions, add account verification and recovery, identity checks, moderation, support workflows, local marketplace terms/privacy notices, and a payment provider. Keep secret values in an ignored `.env.local` file or the hosting provider's secret store.

## Data and privacy

The server stores account emails and salted password hashes in Neon on the live site and SQLite on a local development machine. Public worker profiles show a member's name, headline, skills, category, work mode, location, starting rate, availability, and reviews. Task applications and booking details are visible to the relevant participants. The app does not request precise GPS location, identity documents, or payment-card data. When AI chat is enabled, the user's message and recent chat context are sent to Google Gemini for a response.
