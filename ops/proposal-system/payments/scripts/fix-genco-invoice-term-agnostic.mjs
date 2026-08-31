/**
 * One-off patch: make Genco invoice AWI-202604-H82Z3 term-agnostic so the
 * line-item descriptions, discount label, and billing-clarity schedule stay
 * consistent when the client toggles 1-mo / 3-mo / 6-mo on the public view.
 *
 * Why:
 *   The public page (apps/client-portal/src/app/invoice/[id]/page.tsx:303-322)
 *   recomputes line-item qty/amount and synthesizes the discount label as
 *   `"{N}-month commitment ({R}% off) + {original discountLabel}"`. Hard-coded
 *   "3 months" inside descriptions and a "3-month prepay" inside the discount
 *   label would render misleadingly on the 1-mo and 6-mo toggles.
 *
 * Fix:
 *   - Line items become "Meta Ads Management (monthly)" etc. — qty column
 *     carries the month count, so qty=1/3/6 reads naturally.
 *   - discountLabel keeps only the static piece (the loyalty credit). The UI
 *     will prepend the term-specific commitment label on render.
 *   - billingClarity.schedule lists the service end dates per term so the
 *     client can see the period for whichever term they pick.
 *
 *   Invoice number, public token, FX snapshot, and totals are unchanged.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../node_modules/firebase-admin'));

const sa = JSON.parse(readFileSync(join(__dirname, '../../../../firebase/service-account.json'), 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
}
const db = admin.firestore();

const INVOICE_ID = 'AWI-202604-H82Z3';
const SERVICE_START = '2026-04-26';
const SERVICE_END = { 1: '2026-05-25', 3: '2026-07-25', 6: '2026-10-25' };
const META_MONTHLY_USD = 260;
const CREDIT_DAYS = 21;
const META_PREPAID_END = '2026-05-16';
const LOYALTY_CREDIT_USD = Math.round((META_MONTHLY_USD * CREDIT_DAYS / 30) * 100) / 100;

async function main() {
    const ref = db.collection('invoices').doc(INVOICE_ID);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`${INVOICE_ID} not found`);
    const current = snap.data();
    const fxRate = current.exchangeRateUsed;
    const breakdowns = current.paymentTermCommitment?.breakdowns || {};

    // Term-agnostic line items using the {months} token. The public viewer
    // (apps/client-portal/src/app/invoice/[id]/page.tsx) rewrites the token
    // to "1 month" / "3 months" / "6 months" matching whichever term the
    // client toggles, so descriptions, qty, and amount all stay consistent.
    // baseQuantities=[1,1,1] in paymentTermCommitment causes the public page
    // to re-render qty as 1/3/6 when the client toggles term.
    //
    // IMPORTANT: the page.tsx token rewriter must be deployed in production
    // before running this script, otherwise the client sees the literal text
    // "{months}" in their invoice.
    const lineItems = [
        {
            description: 'Meta Ads Management — {months}',
            qty: 3,
            rate: META_MONTHLY_USD,
            amount: META_MONTHLY_USD * 3,
        },
        {
            description: 'Google Ads Management — {months}  [NEW platform]',
            qty: 3,
            rate: META_MONTHLY_USD,
            amount: META_MONTHLY_USD * 3,
        },
        {
            description: 'Amazon Ads Management — {months}  [LOYALTY GESTURE · platform fees waived]',
            qty: 3,
            rate: 0,
            amount: 0,
        },
    ];

    // discountLabel keeps only the term-independent loyalty credit. The UI
    // prepends the dynamic "{N}-month commitment ({R}% off)" itself.
    const discountLabel = `Loyalty credit — ${CREDIT_DAYS} unused Meta days through ${META_PREPAID_END} (−$${LOYALTY_CREDIT_USD.toFixed(2)})`;

    // Term-aware billing clarity: one row per term so the client always sees
    // the period and EGP amount that matches whichever term they pick.
    const b = (t) => breakdowns[t];
    const billingClarity = {
        title: 'What This Invoice Covers',
        dueNowLabel: `Multi-platform ad management starting ${SERVICE_START}`,
        schedule: [
            { label: 'Service start', value: `${SERVICE_START} (next Sunday)` },
            { label: 'Meta Ads Management', value: `$${META_MONTHLY_USD.toFixed(2)}/month (ongoing)` },
            { label: 'Google Ads Management', value: `$${META_MONTHLY_USD.toFixed(2)}/month — NEW platform` },
            { label: 'Amazon Ads Management', value: 'Waived as loyalty gesture (still delivered in scope)' },
            { label: `Loyalty credit — ${CREDIT_DAYS} unused Meta days`, value: `−$${LOYALTY_CREDIT_USD.toFixed(2)} (Meta prepaid through ${META_PREPAID_END})` },
            { label: '— — — Choose your term — — —', value: '' },
            { label: '1 month', value: `service through ${SERVICE_END[1]} · $${b(1).totalDue.toFixed(2)} USD ≈ ${b(1).instapayAmountEgp.toLocaleString()} EGP` },
            { label: '3 months (default · 5% off)', value: `service through ${SERVICE_END[3]} · $${b(3).totalDue.toFixed(2)} USD ≈ ${b(3).instapayAmountEgp.toLocaleString()} EGP` },
            { label: '6 months (10% off)', value: `service through ${SERVICE_END[6]} · $${b(6).totalDue.toFixed(2)} USD ≈ ${b(6).instapayAmountEgp.toLocaleString()} EGP` },
            { label: 'Egypt InstaPay settlement', value: `at 1 USD = ${fxRate.toFixed(2)} EGP (realegp.com/usd, refreshes every 3 days)` },
        ],
        scopeIncluded: [
            'Meta Ads campaign management (ongoing)',
            'Google Ads setup + management (Search / Shopping / Performance Max as applicable)',
            'Amazon Ads setup + management (Sponsored Products)',
            'Monthly performance reports across all active platforms',
            'Pixel/tag setup + conversion tracking review on new platforms',
        ],
        scopeExcluded: [
            'Ad spend / media budget (paid directly by Genco to each platform)',
            'Creative production beyond standard ad copy adaptation',
            'Landing page development',
        ],
    };

    await ref.update({
        lineItems,
        discountLabel,
        billingClarity,
        notes: [
            `Genco upgrade: Meta-only → Meta + Google + Amazon.`,
            `Service starts ${SERVICE_START} (next Sunday). Default 3-month term; client may switch to 1-month or 6-month at confirmation.`,
            `Service end by term: 1mo ${SERVICE_END[1]}, 3mo ${SERVICE_END[3]}, 6mo ${SERVICE_END[6]}.`,
            `Amazon Ads management fees waived as a loyalty gesture (still delivered in scope).`,
            `Loyalty credit: $${LOYALTY_CREDIT_USD} for ${CREDIT_DAYS} unused Meta days on prior prepaid subscription (ended ${META_PREPAID_END}).`,
            `Egypt InstaPay settlement at realegp.com/usd market rate, rounded to nearest 50 EGP.`,
            `Invoice number uses new non-sequential randomized scheme (AWI-YYYYMM-TOKEN5).`,
        ].join('\n'),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Patched ${INVOICE_ID}`);
    console.log('  Line items now term-agnostic (qty multiplies on term toggle).');
    console.log('  discountLabel reduced to loyalty credit only — UI prepends commitment label.');
    console.log('  billingClarity.schedule shows per-term service end + EGP amounts.');
    console.log(`  Public link unchanged: https://my.admireworks.com/invoice/${current.publicAccessToken}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
