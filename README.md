This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ARC Health iPhone companion

Open `ios/ARCHealth.xcodeproj` in Xcode 16 or later. The app targets iOS 17+.
Choose your Apple Developer team in Signing & Capabilities, keep automatic signing
and HealthKit + Background Delivery enabled, and use a unique bundle identifier
if `com.mdh2321.arc.health` is unavailable. Run on your physical iPhone. No team,
certificate, API key, or health data is included in the source.

The backend must include `/api/sync/healthkit`. In the app, enter your ARC HTTPS
address and the existing `SYNC_API_KEY` from Vercel, then review Apple's Health
permissions. The key stays in the device Keychain. ARC reads Health; it does not
record workouts or write Health samples. Keep Oura's Health sharing enabled.

Initial import covers all readable workouts and 90 days of steps and sleep.
Leave the app open during the first import. Anchors and pending uploads are
protected on disk, excluded from backup, and advanced only after ARC acknowledges
the batch. A lost response is safe to retry. Recent workouts (up to 25 from the
last 14 days) are refreshed for late heart-rate and distance updates. Missing
read permissions cannot be distinguished from missing Health data; empty queries
do not erase existing data. Confirmed tombstones can clear previously native-owned
days and workouts. Use one active companion installation per ARC account.

Sleep prefers Oura when it has sleep for that waking date, otherwise the source
with the most non-overlapping sleep. Stage overlaps and duplicate sources are
not summed. Daily step totals come from HealthKit statistics. Day grouping uses
the iPhone's current time zone; workout dates use HealthKit's time-zone metadata
when available. Existing legacy workout IDs are adopted only for an unambiguous
exact start-time/name match; ambiguous matches stop the batch for review.

Keep Auto Export until a device test confirms a recent run, step total and night
of sleep match Health and ARC. Test an offline upload followed by reconnecting,
and verify a later Oura update arrives without opening the companion. Then disable
Auto Export's automations. Native-owned days/workouts are protected against
subsequent Auto Export overwrites. iOS controls background scheduling; Sync now
and foreground catch-up remain available. Force-quitting, locked Health data,
permissions and iOS scheduling can delay uploads. Real background delivery must
be tested on a device; a simulator build does not verify it.

For TestFlight, select a distribution team, archive in Xcode and upload through
Organizer/App Store Connect. Complete Apple's privacy information for this
personal server before distribution. The included privacy manifest declares
health/fitness use and no tracking. The existing ARC website's broader access
control is outside this companion change: only sync endpoints are authenticated
by this patch. An authenticated dashboard should be added before wider sharing.

Verification: `npm run test:sync`, `npx tsc --noEmit`, and
`swift test --package-path ios`. GitHub Actions also builds the iPhone app for the
simulator without signing. Neither local tests nor CI use the production health
database. Server changes add three metadata tables; existing health tables are
preserved. Rolling back application code leaves these harmless tables in place.
