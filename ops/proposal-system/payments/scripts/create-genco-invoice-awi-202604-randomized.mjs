/**
 * Create Genco invoice (AWI-202604-{random5}) — expansion from Meta-only to
 * Meta + Google + Amazon, charging for 2 platforms (Amazon waived as loyalty
 * gesture) + credit for 21 unused Meta prepaid days through 2026-05-16.
 *
 *   Client:     Genco (OGBZCwtTuTFIchYXcKO9) — Egypt, fashion e-commerce
 *   Contact:    Ahmed Kotb · info@gencostores.com · +201005659590
 *   Currency:   USD contract with Egypt InstaPay EGP settlement
 *   FX source:  realegp.com/usd market rate, rounded to 50 EGP, refresh 3d
 *   Issued:     2026-04-23   Due: 2026-04-26   Service starts: 2026-04-26
 *   Invoice #:  AWI-202604-{TOKEN5}  — non-sequential randomized numbering
 *
 *   Pricing (3-month default):
 *     Meta   $260/mo × 3 =  $780
 *     Google $260/mo × 3 =  $780
 *     Amazon  $0   × 3  =    $0   (loyalty gesture, fees waived)
 *                       ---------
 *     Subtotal:          $1,560
 *     3-month prepay (-5%)     -$78
 *     Loyalty credit (21 days) -$182
 *     Total due:         $1,300 USD
 *
 *   Term toggles via paymentTermCommitment:
 *     1 mo → $338   3 mo → $1,300 (default)   6 mo → $2,626
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../node_modules/firebase-admin'));

const serviceAccountPath = join(__dirname, '../../../../firebase/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const db = admin.firestore();

// ─── Constants ────────────────────────────────────────────────────────────
const GENCO_CLIENT_ID = 'OGBZCwtTuTFIchYXcKO9';
const ISSUED_AT = '2026-04-23';                  // tomorrow
const DUE_DATE = '2026-04-26';                   // next Sunday, aligned with service start
const SERVICE_START = '2026-04-26';              // next Sunday
const SERVICE_END_3MO = '2026-07-25';            // 3 months later
const META_PREPAID_END = '2026-05-16';
const CREDIT_DAYS = 21;                          // Apr 26 → May 16 inclusive
const META_MONTHLY_USD = 260;
const LOYALTY_CREDIT_USD = Math.round((META_MONTHLY_USD * CREDIT_DAYS / 30) * 100) / 100; // 182.00

const REAL_EGP_URL = 'https://realegp.com/usd';
const REFRESH_INTERVAL_DAYS = 3;
const ROUNDING_INCREMENT_EGP = 50;

const INVOICE_TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/I/1/L
const INVOICE_TOKEN_LENGTH = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────
const round2 = (n) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

function roundToNearestIncrement(amount, increment) {
    return Math.round(amount / increment) * increment;
}

function getNextRefreshAt(fromIso, days) {
    const next = new Date(fromIso);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString();
}

function randomToken(length = INVOICE_TOKEN_LENGTH) {
    const bytes = randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
        out += INVOICE_TOKEN_ALPHABET[bytes[i] % INVOICE_TOKEN_ALPHABET.length];
    }
    return out;
}

function randomPublicAccessToken() {
    // 32 url-safe chars for the invoice public link
    return randomBytes(24).toString('base64url');
}

async function fetchEgyptRate() {
    const response = await fetch(REAL_EGP_URL, {
        headers: {
            'User-Agent': 'Admireworks Finance Bot/1.0',
            Accept: 'text/html,application/xhtml+xml',
        },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${REAL_EGP_URL} (${response.status})`);

    const html = await response.text();
    const rateMatch = html.match(/سعر السوق<\/div>\s*<div[^>]*>\s*([0-9]+(?:\.[0-9]+)?)/)
        || html.match(/<div class="big-price">\s*([0-9]+(?:\.[0-9]+)?)\s*<\/div>/);
    if (!rateMatch) throw new Error('Unable to parse market rate from realegp.com/usd');

    const timeMatch = html.match(/<time[^>]*dateTime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/i);
    const fetchedAt = new Date().toISOString();
    const rate = Number(rateMatch[1]);

    return {
        used: rate,
        date: (timeMatch?.[1] || fetchedAt).match(/\d{4}-\d{2}-\d{2}/)?.[0] || fetchedAt.slice(0, 10),
        sourceUrl: REAL_EGP_URL,
        sourceKind: 'realegp_market',
        sourceUpdatedAt: timeMatch?.[1] || '',
        sourceUpdatedLabel: timeMatch?.[2]
            ?.replace(/<br\s*\/?>/gi, ' ')
            ?.replace(/<\/?[^>]+>/g, ' ')
            ?.replace(/\s+/g, ' ')
            ?.trim() || '',
        fetchedAt,
        pricingRule: `Market rate from realegp.com/usd, rounded to nearest ${ROUNDING_INCREMENT_EGP} EGP`,
        roundingIncrementEgp: ROUNDING_INCREMENT_EGP,
    };
}

async function pickUniqueInvoiceNumber(yearMonth) {
    const prefix = `AWI-${yearMonth}-`;
    const existing = await db.collection('invoices')
        .where('invoiceNumber', '>=', prefix)
        .where('invoiceNumber', '<', `AWI-${yearMonth}~`) // '~' > '-' in ASCII
        .get();
    const taken = new Set(existing.docs.map((d) => d.data().invoiceNumber));

    for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = `${prefix}${randomToken()}`;
        if (!taken.has(candidate)) return candidate;
    }
    throw new Error(`Could not generate unique invoice number for ${prefix} after 100 attempts`);
}

function computeBreakdowns(rate) {
    // Platform fees (paid): Meta $260/mo + Google $260/mo = $520/mo
    // Amazon line is $0 (waived). Only paid lines count toward commitment discount.
    const paidMonthlyUsd = META_MONTHLY_USD * 2;
    const terms = [1, 3, 6];
    const discountRates = { 1: 0, 3: 0.05, 6: 0.10 };
    const breakdowns = {};

    for (const term of terms) {
        const subtotalBeforeDiscount = round2(paidMonthlyUsd * term);
        const commitmentDiscount = round2(subtotalBeforeDiscount * discountRates[term]);
        const fixedDiscount = LOYALTY_CREDIT_USD;
        const subtotalAfterDiscount = round2(
            Math.max(0, subtotalBeforeDiscount - commitmentDiscount - fixedDiscount),
        );
        const totalDue = subtotalAfterDiscount; // tax = 0
        const instapayAmountEgp = roundToNearestIncrement(totalDue * rate, ROUNDING_INCREMENT_EGP);
        breakdowns[term] = {
            termMonths: term,
            discountRate: discountRates[term],
            subtotalBeforeDiscount,
            commitmentDiscount,
            fixedDiscount,
            subtotalAfterDiscount,
            tax: 0,
            totalDue,
            exchangeRateUsed: rate,
            instapayAmountEgp,
        };
    }
    return breakdowns;
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
    console.log('Fetching realegp.com/usd live rate…');
    const fxQuote = await fetchEgyptRate();
    console.log(`  → ${fxQuote.used} EGP/USD (${fxQuote.sourceUpdatedLabel || fxQuote.fetchedAt})`);

    console.log('\nPicking unique invoice number…');
    const invoiceNumber = await pickUniqueInvoiceNumber('202604');
    const publicAccessToken = randomPublicAccessToken();
    console.log(`  → ${invoiceNumber}`);
    console.log(`  → public token: ${publicAccessToken}`);

    console.log('\nComputing term breakdowns…');
    const breakdowns = computeBreakdowns(fxQuote.used);
    for (const term of [1, 3, 6]) {
        const b = breakdowns[term];
        console.log(`  ${term}-month: $${b.totalDue.toFixed(2)} USD ≈ ${b.instapayAmountEgp.toLocaleString()} EGP`);
    }

    const defaultTerm = 3;
    const defaultBreakdown = breakdowns[defaultTerm];

    // ─── Expanded line items for the default (3-month) view ───
    const lineItems = [
        {
            description: `Meta Ads Management — 3 months (${SERVICE_START} → ${SERVICE_END_3MO})`,
            qty: 3,
            rate: META_MONTHLY_USD,
            amount: round2(META_MONTHLY_USD * 3),
        },
        {
            description: `Google Ads Management — 3 months (${SERVICE_START} → ${SERVICE_END_3MO})  [NEW]`,
            qty: 3,
            rate: META_MONTHLY_USD,
            amount: round2(META_MONTHLY_USD * 3),
        },
        {
            description: `Amazon Ads Management — 3 months  [LOYALTY GESTURE · platform fees waived]`,
            qty: 3,
            rate: 0,
            amount: 0,
        },
    ];

    const subtotal = round2(lineItems.reduce((sum, li) => sum + li.amount, 0));
    const discount = round2(defaultBreakdown.commitmentDiscount + defaultBreakdown.fixedDiscount);
    const discountLabel = [
        `3-month prepay (−5% · $${defaultBreakdown.commitmentDiscount.toFixed(2)})`,
        `Loyalty credit — ${CREDIT_DAYS} unused Meta days through ${META_PREPAID_END} (−$${LOYALTY_CREDIT_USD.toFixed(2)})`,
    ].join(' + ');
    const totalDue = defaultBreakdown.totalDue;

    // ─── Base (1-month) line items for paymentTermCommitment ───
    const baseLineItems = [
        { description: 'Meta Ads Management (monthly)', qty: 1, rate: META_MONTHLY_USD, amount: META_MONTHLY_USD },
        { description: 'Google Ads Management (monthly)', qty: 1, rate: META_MONTHLY_USD, amount: META_MONTHLY_USD },
        { description: 'Amazon Ads Management — loyalty waived', qty: 1, rate: 0, amount: 0 },
    ];
    const paymentTermCommitment = {
        availableTerms: [1, 3, 6],
        defaultTerm,
        breakdowns,
        baseQuantities: baseLineItems.map((li) => li.qty),
    };

    // ─── Billing clarity schedule shown on the public invoice view ───
    const billingClarity = {
        title: 'What This Invoice Covers',
        dueNowLabel: `3-month prepaid service starting ${SERVICE_START}`,
        schedule: [
            { label: 'Service period (default 3-month)', value: `${SERVICE_START} → ${SERVICE_END_3MO}` },
            { label: 'Meta Ads Management (ongoing)', value: `$${META_MONTHLY_USD.toFixed(2)}/mo × 3 = $780.00` },
            { label: 'Google Ads Management (NEW)', value: `$${META_MONTHLY_USD.toFixed(2)}/mo × 3 = $780.00` },
            { label: 'Amazon Ads Management', value: 'Loyalty gesture — platform fees waived (included free)' },
            { label: '3-month prepay discount', value: `−$${defaultBreakdown.commitmentDiscount.toFixed(2)} (5% off)` },
            { label: `Credit — ${CREDIT_DAYS} unused Meta days`, value: `−$${LOYALTY_CREDIT_USD.toFixed(2)} (prepaid through ${META_PREPAID_END})` },
            { label: 'Total due (USD)', value: `$${totalDue.toFixed(2)}` },
            { label: 'Egypt InstaPay settlement', value: `${defaultBreakdown.instapayAmountEgp.toLocaleString()} EGP at 1 USD = ${fxQuote.used.toFixed(2)} EGP` },
            { label: 'Alternate term — 1 month', value: `$${breakdowns[1].totalDue.toFixed(2)} USD ≈ ${breakdowns[1].instapayAmountEgp.toLocaleString()} EGP` },
            { label: 'Alternate term — 6 months', value: `$${breakdowns[6].totalDue.toFixed(2)} USD ≈ ${breakdowns[6].instapayAmountEgp.toLocaleString()} EGP (10% off)` },
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

    // ─── Update Genco client doc: add contact + root email ───
    console.log('\nUpdating Genco client doc (adding contact)…');
    const clientRef = db.collection('clients').doc(GENCO_CLIENT_ID);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) throw new Error(`Genco client ${GENCO_CLIENT_ID} not found`);
    const existingContacts = Array.isArray(clientSnap.data().contacts) ? clientSnap.data().contacts : [];
    const hasAhmed = existingContacts.some((c) => c.email === 'info@gencostores.com');
    const newContacts = hasAhmed ? existingContacts : [
        ...existingContacts,
        {
            name: 'Ahmed Kotb',
            email: 'info@gencostores.com',
            phone: '+201005659590',
            role: 'primary',
        },
    ];
    await clientRef.set({
        email: 'info@gencostores.com',
        phone: '+201005659590',
        contacts: newContacts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`  → contact ${hasAhmed ? 'already present (skipped)' : 'added: Ahmed Kotb'}`);

    // ─── Create the invoice ───
    console.log('\nCreating invoice doc…');
    const invoicePayload = {
        invoiceNumber,
        clientId: GENCO_CLIENT_ID,
        clientName: 'Genco',
        currency: 'USD',
        locale: 'en',
        status: 'pending',
        issuedAt: ISSUED_AT,
        dueDate: DUE_DATE,
        paymentRegion: 'egypt',
        paymentMethods: ['instapay'],
        paymentVerificationState: 'none',
        paymentTerms: `USD contract — Egypt InstaPay settlement at realegp.com/usd market rate, rounded to nearest ${ROUNDING_INCREMENT_EGP} EGP. Service starts ${SERVICE_START} (next Sunday).`,
        lineItems,
        subtotal,
        discount,
        discountLabel,
        tax: 0,
        totalDue,
        billingClarity,
        billingPolicy: {
            legacyServiceCode: 'Ad Mgt',
            servicePeriodMonths: defaultTerm,
        },
        paymentTermCommitment,
        exchangeRateSnapshot: {
            ...fxQuote,
            baseAmountUsd: totalDue,
            convertedAmount: round2(totalDue * fxQuote.used),
            roundedAmount: defaultBreakdown.instapayAmountEgp,
        },
        exchangeRateUsed: fxQuote.used,
        exchangeRateDate: fxQuote.date,
        exchangeRateSourceUrl: fxQuote.sourceUrl,
        exchangeRateLastUpdatedAt: fxQuote.fetchedAt,
        exchangeRateNextRefreshAt: getNextRefreshAt(fxQuote.fetchedAt, REFRESH_INTERVAL_DAYS),
        exchangeRateRefreshIntervalDays: REFRESH_INTERVAL_DAYS,
        exchangeRateSourceKind: fxQuote.sourceKind,
        pricingRule: fxQuote.pricingRule,
        publicAccessToken,
        publicAccessEnabledAt: admin.firestore.FieldValue.serverTimestamp(),
        notes: [
            `Genco upgrade: Meta-only → Meta + Google + Amazon.`,
            `Service starts ${SERVICE_START} (next Sunday). Client's prior Meta subscription was prepaid through ${META_PREPAID_END}; the ${CREDIT_DAYS}-day overlap is credited back (−$${LOYALTY_CREDIT_USD.toFixed(2)}).`,
            `Amazon Ads management fees are waived as a loyalty gesture (still delivered in scope).`,
            `Egypt InstaPay settlement snapshot: ${defaultBreakdown.instapayAmountEgp.toLocaleString()} EGP at 1 USD = ${fxQuote.used.toFixed(2)} EGP (realegp.com/usd, ${fxQuote.sourceUpdatedLabel || fxQuote.date}).`,
            `Invoice number uses new non-sequential randomized scheme (AWI-YYYYMM-TOKEN5).`,
        ].join('\n'),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('invoices').doc(invoiceNumber).set(invoicePayload);
    console.log(`  → Firestore: invoices/${invoiceNumber}`);

    console.log('\n─────────────────────────────────────────────');
    console.log(`✓ Invoice created: ${invoiceNumber}`);
    console.log(`  Total due: $${totalDue.toFixed(2)} USD ≈ ${defaultBreakdown.instapayAmountEgp.toLocaleString()} EGP`);
    console.log(`  FX snapshot: 1 USD = ${fxQuote.used} EGP (${fxQuote.sourceUpdatedLabel || fxQuote.date})`);
    console.log(`  Portal (by number): https://my.admireworks.com/invoice/${invoiceNumber}`);
    console.log(`  Portal (by token):  https://my.admireworks.com/invoice/${publicAccessToken}`);
    console.log('─────────────────────────────────────────────');

    return { invoiceNumber, publicAccessToken, totalDue, fxQuote, defaultBreakdown };
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
