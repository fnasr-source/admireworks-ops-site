#!/usr/bin/env node
/**
 * One-off Basseqat Google Cloud/Firebase pass-through cost invoice.
 *
 * Dry run:
 *   node ops/proposal-system/payments/scripts/create-basseqat-gcp-cost-invoice-202607.mjs
 *
 * Apply:
 *   node ops/proposal-system/payments/scripts/create-basseqat-gcp-cost-invoice-202607.mjs --apply
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../../..');
const clientPortalPackage = join(rootDir, 'apps/client-portal/package.json');
const firebasePackage = join(rootDir, 'firebase/package.json');
const requireClientPortal = createRequire(clientPortalPackage);
const requireFirebase = createRequire(firebasePackage);

const { BigQuery } = requireClientPortal('@google-cloud/bigquery');
const { cert, getApps, initializeApp } = requireFirebase('firebase-admin/app');
const { FieldValue, getFirestore } = requireFirebase('firebase-admin/firestore');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');

const BASSEQAT_CLIENT_ID = 'IWvO6Ct67XFWztaufyeT';
const BILLING_PROJECT_ID = 'basseqat-e8e95';
const BILLING_ACCOUNT_ID = '01CAC2-DA4A57-479E68';
const BILLING_TABLE = '`basseqat-e8e95.basseqat_billing_export.gcp_billing_export_v1_01CAC2_DA4A57_479E68`';
const INVOICE_MONTH_START = '202603';
const INVOICE_MONTH_END = '202606';
const EXPECTED_TOTAL_USD = 100.92;
const INSTAPAY_AMOUNT_EGP = 5050;
const REAL_EGP_RATE = 50.25;
const REAL_EGP_SOURCE_URL = 'https://realegp.com/usd';
const REAL_EGP_SOURCE_UPDATED_AT = '2026-07-09T10:15:00+02:00';
const REAL_EGP_SOURCE_UPDATED_LABEL = '2026-07-09 10:15 Cairo';
const ISSUED_AT = '2026-07-09';
const DUE_DATE = '2026-07-09';
const SOURCE_KEY = 'basseqat-gcp-costs-202603-202606';
const BASE_URL = 'https://my.admireworks.com';

const internalSaPath = resolve(rootDir, 'firebase/service-account.json');
const basseqatSaPath = resolve(rootDir, '../Basseqat/firebase/service-account.json');
const registryPath = resolve(rootDir, 'ops/proposal-system/payments/invoice-registry.csv');

const INVOICE_TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function formatUsd(n) {
  return `$${round2(n).toFixed(2)}`;
}

function randomInvoiceToken(length = 5) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += INVOICE_TOKEN_ALPHABET[bytes[i] % INVOICE_TOKEN_ALPHABET.length];
  }
  return out;
}

function randomPublicAccessToken() {
  return randomBytes(24).toString('base64url');
}

function monthLabel(month) {
  const date = new Date(`${month.slice(0, 4)}-${month.slice(4, 6)}-01T00:00:00Z`);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function assertServiceAccounts() {
  if (!existsSync(basseqatSaPath)) {
    throw new Error(`Missing Basseqat service account for BigQuery reads: ${basseqatSaPath}`);
  }
  if (!existsSync(internalSaPath)) {
    throw new Error(`Missing Internal OS service account for Firestore writes: ${internalSaPath}`);
  }
}

function initFirestore() {
  if (getApps().length > 0) return getFirestore();
  const sa = JSON.parse(readFileSync(internalSaPath, 'utf8'));
  initializeApp({
    credential: cert(sa),
    projectId: sa.project_id,
  });
  return getFirestore();
}

async function queryBillingExport() {
  const bq = new BigQuery({
    projectId: BILLING_PROJECT_ID,
    keyFilename: basseqatSaPath,
  });

  const monthlySql = `
    WITH usage AS (
      SELECT
        invoice.month AS invoice_month,
        ANY_VALUE(currency) AS currency,
        ANY_VALUE(currency_conversion_rate) AS currency_conversion_rate,
        SUM(cost) AS gross_cost,
        COUNTIF(cost_type != 'regular') AS non_regular_rows
      FROM ${BILLING_TABLE}
      WHERE project.id = @projectId
        AND invoice.month BETWEEN @monthStart AND @monthEnd
        AND cost_type = 'regular'
      GROUP BY invoice.month
    ),
    credits_by_month AS (
      SELECT
        invoice.month AS invoice_month,
        SUM(c.amount) AS credit_amount
      FROM ${BILLING_TABLE}, UNNEST(credits) AS c
      WHERE project.id = @projectId
        AND invoice.month BETWEEN @monthStart AND @monthEnd
        AND cost_type = 'regular'
      GROUP BY invoice.month
    ),
    all_months AS (
      SELECT '202603' AS invoice_month UNION ALL
      SELECT '202604' UNION ALL
      SELECT '202605' UNION ALL
      SELECT '202606'
    )
    SELECT
      m.invoice_month,
      COALESCE(u.gross_cost, 0) AS gross_cost,
      COALESCE(c.credit_amount, 0) AS credit_amount,
      COALESCE(u.gross_cost, 0) + COALESCE(c.credit_amount, 0) AS net_cost,
      COALESCE(u.currency, 'USD') AS currency,
      COALESCE(u.currency_conversion_rate, 1) AS currency_conversion_rate,
      COALESCE(u.non_regular_rows, 0) AS non_regular_rows
    FROM all_months m
    LEFT JOIN usage u USING (invoice_month)
    LEFT JOIN credits_by_month c USING (invoice_month)
    ORDER BY m.invoice_month
  `;

  const projectSql = `
    WITH usage AS (
      SELECT
        project.id AS project_id,
        SUM(cost) AS gross_cost
      FROM ${BILLING_TABLE}
      WHERE invoice.month BETWEEN @monthStart AND @monthEnd
        AND cost_type = 'regular'
      GROUP BY project.id
    ),
    credits_by_project AS (
      SELECT
        project.id AS project_id,
        SUM(c.amount) AS credit_amount
      FROM ${BILLING_TABLE}, UNNEST(credits) AS c
      WHERE invoice.month BETWEEN @monthStart AND @monthEnd
        AND cost_type = 'regular'
      GROUP BY project.id
    )
    SELECT
      u.project_id,
      u.gross_cost,
      COALESCE(c.credit_amount, 0) AS credit_amount,
      u.gross_cost + COALESCE(c.credit_amount, 0) AS net_cost
    FROM usage u
    LEFT JOIN credits_by_project c USING (project_id)
    ORDER BY net_cost DESC
  `;

  const adjustmentSql = `
    SELECT
      cost_type,
      COUNT(*) AS row_count,
      SUM(cost) AS gross_cost
    FROM ${BILLING_TABLE}
    WHERE project.id = @projectId
      AND invoice.month BETWEEN @monthStart AND @monthEnd
      AND cost_type != 'regular'
    GROUP BY cost_type
    ORDER BY cost_type
  `;

  const slimGameJuneSql = `
    WITH usage AS (
      SELECT
        project.id AS project_id,
        SUM(cost) AS gross_cost
      FROM ${BILLING_TABLE}
      WHERE project.id = 'the-slim-game'
        AND invoice.month = '202606'
        AND cost_type = 'regular'
      GROUP BY project.id
    ),
    credits_by_project AS (
      SELECT
        project.id AS project_id,
        SUM(c.amount) AS credit_amount
      FROM ${BILLING_TABLE}, UNNEST(credits) AS c
      WHERE project.id = 'the-slim-game'
        AND invoice.month = '202606'
        AND cost_type = 'regular'
      GROUP BY project.id
    )
    SELECT
      u.project_id,
      u.gross_cost,
      COALESCE(c.credit_amount, 0) AS credit_amount,
      u.gross_cost + COALESCE(c.credit_amount, 0) AS net_cost
    FROM usage u
    LEFT JOIN credits_by_project c USING (project_id)
  `;

  const params = {
    projectId: BILLING_PROJECT_ID,
    monthStart: INVOICE_MONTH_START,
    monthEnd: INVOICE_MONTH_END,
  };

  const [[monthlyRows], [projectRows], [adjustmentRows], [slimGameJuneRows]] = await Promise.all([
    bq.query({ query: monthlySql, params, useLegacySql: false }),
    bq.query({ query: projectSql, params, useLegacySql: false }),
    bq.query({ query: adjustmentSql, params, useLegacySql: false }),
    bq.query({ query: slimGameJuneSql, useLegacySql: false }),
  ]);

  return { monthlyRows, projectRows, adjustmentRows, slimGameJuneRows };
}

function validateBillingRows(monthlyRows, adjustmentRows) {
  const totalExact = monthlyRows.reduce((sum, row) => sum + Number(row.net_cost || 0), 0);
  const roundedTotal = round2(totalExact);
  if (roundedTotal !== EXPECTED_TOTAL_USD) {
    throw new Error(`Refusing to apply: rounded BigQuery total ${formatUsd(roundedTotal)} does not match expected ${formatUsd(EXPECTED_TOTAL_USD)}`);
  }
  for (const row of monthlyRows) {
    if (row.currency !== 'USD') {
      throw new Error(`Refusing to apply: ${row.invoice_month} currency is ${row.currency}, expected USD`);
    }
    if (Number(row.currency_conversion_rate) !== 1) {
      throw new Error(`Refusing to apply: ${row.invoice_month} currency_conversion_rate is ${row.currency_conversion_rate}, expected 1`);
    }
    if (Number(row.non_regular_rows) !== 0) {
      throw new Error(`Refusing to apply: ${row.invoice_month} has non-regular rows`);
    }
  }
  if (adjustmentRows.length > 0) {
    throw new Error(`Refusing to apply: found non-regular adjustment rows: ${JSON.stringify(adjustmentRows)}`);
  }
  return { totalExact, roundedTotal };
}

function buildLineItems(monthlyRows) {
  const visibleMonthly = monthlyRows.map((row) => {
    const exactNet = Number(row.net_cost || 0);
    return {
      description: `${monthLabel(row.invoice_month)} Google Cloud/Firebase pass-through`,
      qty: 1,
      rate: Math.max(0, round2(exactNet)),
      amount: Math.max(0, round2(exactNet)),
      sourceMonth: row.invoice_month,
      sourceGrossUsd: Number(row.gross_cost || 0),
      sourceCreditsUsd: Math.abs(Number(row.credit_amount || 0)),
      sourceExactNetUsd: exactNet,
    };
  });

  const visibleTotal = visibleMonthly.reduce((sum, item) => sum + item.amount, 0);
  const reconciliation = round2(EXPECTED_TOTAL_USD - visibleTotal);
  if (reconciliation !== 0.01) {
    throw new Error(`Unexpected visible-line reconciliation ${formatUsd(reconciliation)}; expected $0.01`);
  }

  return [
    ...visibleMonthly,
    {
      description: 'Sub-cent billing export rounding reconciliation',
      qty: 1,
      rate: reconciliation,
      amount: reconciliation,
      note: 'Not a fee; reconciles two-decimal visible lines to the exact BigQuery total.',
    },
  ];
}

async function pickUniqueInvoiceNumber(db) {
  const prefix = 'AWI-202607-';
  const existing = await db.collection('invoices')
    .where('invoiceNumber', '>=', prefix)
    .where('invoiceNumber', '<', 'AWI-202607~')
    .get();
  const taken = new Set(existing.docs.map((doc) => doc.data().invoiceNumber));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = `${prefix}${randomInvoiceToken()}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique AWI-202607 invoice number');
}

async function findExistingSourceInvoice(db) {
  const snap = await db.collection('invoices')
    .where('clientId', '==', BASSEQAT_CLIENT_ID)
    .where('sourceMetadata.sourceKey', '==', SOURCE_KEY)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

function buildInvoicePayload({ invoiceNumber, publicAccessToken, monthlyRows, lineItems, totalExact }) {
  const convertedAmount = round2(EXPECTED_TOTAL_USD * REAL_EGP_RATE);
  return {
    invoiceNumber,
    clientId: BASSEQAT_CLIENT_ID,
    clientName: 'Basseqat',
    currency: 'USD',
    locale: 'en',
    status: 'draft',
    issuedAt: ISSUED_AT,
    dueDate: DUE_DATE,
    paymentRegion: 'egypt',
    paymentMethods: ['instapay'],
    paymentVerificationState: 'none',
    paymentTerms: 'USD pass-through invoice with Egypt InstaPay settlement shown from the stored RealEGP market-rate snapshot.',
    lineItems,
    subtotal: EXPECTED_TOTAL_USD,
    tax: 0,
    totalDue: EXPECTED_TOTAL_USD,
    instapayAmountOverrideEgp: INSTAPAY_AMOUNT_EGP,
    billingClarity: {
      title: 'What This Draft Invoice Covers',
      dueNowLabel: 'Draft for review',
      schedule: [
        { label: 'Billing source', value: 'Google Cloud/Firebase finalized billing export' },
        { label: 'Invoice months', value: 'March 2026 through June 2026' },
        { label: 'USD source total', value: formatUsd(EXPECTED_TOTAL_USD) },
        { label: 'Egypt InstaPay settlement', value: `${INSTAPAY_AMOUNT_EGP.toLocaleString()} EGP at 1 USD = ${REAL_EGP_RATE.toFixed(2)} EGP` },
        { label: 'Pass-through policy', value: 'No markup, no admin fee, no tax, and Google billing credits applied at source' },
      ],
      scopeIncluded: [
        'Basseqat Google Cloud and Firebase usage for finalized invoice months March-June 2026',
        'Regular cost rows only',
        'Google billing-export credits applied at source',
      ],
    },
    exchangeRateSnapshot: {
      used: REAL_EGP_RATE,
      date: '2026-07-09',
      sourceUrl: REAL_EGP_SOURCE_URL,
      sourceKind: 'realegp_market',
      sourceUpdatedAt: REAL_EGP_SOURCE_UPDATED_AT,
      sourceUpdatedLabel: REAL_EGP_SOURCE_UPDATED_LABEL,
      fetchedAt: new Date().toISOString(),
      pricingRule: 'RealEGP market rate from realegp.com/usd, rounded to nearest 50 EGP for InstaPay settlement.',
      roundingIncrementEgp: 50,
      baseAmountUsd: EXPECTED_TOTAL_USD,
      convertedAmount,
      roundedAmount: INSTAPAY_AMOUNT_EGP,
    },
    exchangeRateUsed: REAL_EGP_RATE,
    exchangeRateDate: '2026-07-09',
    exchangeRateSourceUrl: REAL_EGP_SOURCE_URL,
    exchangeRateLastUpdatedAt: REAL_EGP_SOURCE_UPDATED_AT,
    exchangeRateSourceKind: 'realegp_market',
    pricingRule: 'No markup, no admin fee, no tax, no Google currency conversion. Egypt InstaPay amount uses RealEGP market rate and is rounded to the nearest 50 EGP.',
    publicAccessToken,
    publicAccessEnabledAt: FieldValue.serverTimestamp(),
    billingPolicy: {
      type: 'gcp_firebase_pass_through',
      sourceProjectId: BILLING_PROJECT_ID,
      billingAccountId: BILLING_ACCOUNT_ID,
      invoiceMonths: monthlyRows.map((row) => row.invoice_month),
    },
    sourceMetadata: {
      sourceKey: SOURCE_KEY,
      sourceType: 'gcp_billing_export',
      destinationProjectId: BILLING_PROJECT_ID,
      datasetId: 'basseqat_billing_export',
      tableId: 'gcp_billing_export_v1_01CAC2_DA4A57_479E68',
      projectIdFilter: BILLING_PROJECT_ID,
      billingAccountId: BILLING_ACCOUNT_ID,
      invoiceMonthStart: INVOICE_MONTH_START,
      invoiceMonthEnd: INVOICE_MONTH_END,
      exactNetUsd: totalExact,
      roundedTotalUsd: EXPECTED_TOTAL_USD,
      generatedBy: 'ops/proposal-system/payments/scripts/create-basseqat-gcp-cost-invoice-202607.mjs',
    },
    notes: [
      'Pass-through Google Cloud/Firebase costs for finalized invoice months March-June 2026.',
      'Google billing credits are already applied in the monthly line amounts.',
      'No markup, admin fee, tax, or Google currency conversion is included.',
      `RealEGP settlement snapshot: ${INSTAPAY_AMOUNT_EGP.toLocaleString()} EGP at 1 USD = ${REAL_EGP_RATE.toFixed(2)} EGP (${REAL_EGP_SOURCE_URL}, updated ${REAL_EGP_SOURCE_UPDATED_LABEL}).`,
    ].join('\n'),
    emailSent: false,
    reminderSent: false,
    reminderState: { legacyFollowUps: { first: false, second: false, third: false } },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function appendRegistryRow({ invoiceNumber, publicAccessToken }) {
  const rows = readFileSync(registryPath, 'utf8').split(/\r?\n/);
  if (rows.some((row) => row.startsWith(`${invoiceNumber},`))) return;
  const reviewUrl = `/invoice/${publicAccessToken}`;
  const notes = 'Draft only; Google Cloud/Firebase pass-through costs for basseqat-e8e95 finalized March-June 2026. $100.92 USD, InstaPay settlement 5,050 EGP at 50.25 EGP/USD. Not sent.';
  const row = [
    invoiceNumber,
    ISSUED_AT,
    DUE_DATE,
    BASSEQAT_CLIENT_ID,
    'Basseqat',
    'Google Cloud/Firebase pass-through costs - March-June 2026',
    EXPECTED_TOTAL_USD.toFixed(2),
    'USD',
    'draft',
    '',
    '',
    reviewUrl,
    'false',
    'false',
    `"${notes.replaceAll('"', '""')}"`,
  ].join(',');
  appendFileSync(registryPath, `${rows.at(-1) === '' ? '' : '\n'}${row}\n`);
}

async function printReadback(db, invoiceNumber) {
  const doc = await db.collection('invoices').doc(invoiceNumber).get();
  if (!doc.exists) throw new Error(`Readback failed: invoices/${invoiceNumber} does not exist`);
  const invoice = doc.data();
  const [history, emails, whatsapp] = await Promise.all([
    doc.ref.collection('history').get(),
    doc.ref.collection('emails').get(),
    doc.ref.collection('whatsapp').get(),
  ]);
  console.log('\nFirestore readback');
  console.log(`  invoiceNumber: ${invoice.invoiceNumber}`);
  console.log(`  status: ${invoice.status}`);
  console.log(`  totalDue: ${formatUsd(invoice.totalDue)} ${invoice.currency}`);
  console.log(`  instapayAmountOverrideEgp: ${Number(invoice.instapayAmountOverrideEgp).toLocaleString()} EGP`);
  console.log(`  exchangeRate: ${invoice.exchangeRateSnapshot?.used} (${invoice.exchangeRateSnapshot?.sourceUpdatedLabel})`);
  console.log(`  publicUrl: ${BASE_URL}/invoice/${invoice.publicAccessToken}`);
  console.log(`  history docs: ${history.size}`);
  console.log(`  email docs: ${emails.size}`);
  console.log(`  whatsapp docs: ${whatsapp.size}`);
}

async function main() {
  assertServiceAccounts();
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} - Basseqat GCP/Firebase pass-through invoice`);
  console.log(`  BigQuery SA: ${basseqatSaPath}`);
  console.log(`  Firestore SA: ${internalSaPath}`);

  const { monthlyRows, projectRows, adjustmentRows, slimGameJuneRows } = await queryBillingExport();
  const { totalExact, roundedTotal } = validateBillingRows(monthlyRows, adjustmentRows);
  const lineItems = buildLineItems(monthlyRows);

  console.log('\nMonthly BigQuery totals');
  for (const row of monthlyRows) {
    console.log(`  ${row.invoice_month}: gross ${formatUsd(row.gross_cost)}, credits ${formatUsd(Math.abs(Number(row.credit_amount || 0)))}, exact net ${Number(row.net_cost).toFixed(6)}, visible ${formatUsd(Math.max(0, round2(row.net_cost)))}`);
  }
  console.log(`  exact total: ${totalExact.toFixed(6)} -> ${formatUsd(roundedTotal)}`);

  console.log('\nProject check for billing account/month window');
  for (const row of projectRows) {
    console.log(`  ${row.project_id || '(empty)'}: exact net ${Number(row.net_cost).toFixed(6)}`);
  }

  const slimGameJune = slimGameJuneRows[0];
  if (!slimGameJune || Math.abs(Number(slimGameJune.net_cost) - 3.705131) > 0.00001) {
    throw new Error(`Slim Game June exclusion check failed: expected 3.705131, got ${slimGameJune ? Number(slimGameJune.net_cost).toFixed(6) : 'missing'}`);
  }
  const june = monthlyRows.find((row) => row.invoice_month === '202606');
  if (!june || Math.abs(Number(june.net_cost) - 64.254087) > 0.00001) {
    throw new Error(`June Basseqat check failed: expected 64.254087, got ${june ? Number(june.net_cost).toFixed(6) : 'missing'}`);
  }
  console.log('\nChecks passed');
  console.log('  Basseqat rounded total is $100.92');
  console.log('  June Basseqat exact net is $64.254087');
  console.log('  the-slim-game June exact net is $3.705131 and is excluded');

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to create the draft invoice and update the registry.');
    return;
  }

  const db = initFirestore();
  const existingSource = await findExistingSourceInvoice(db);
  if (existingSource) {
    const data = existingSource.data();
    throw new Error(`Refusing duplicate: source invoice already exists at invoices/${existingSource.id} (${data.invoiceNumber}, status ${data.status})`);
  }

  const invoiceNumber = await pickUniqueInvoiceNumber(db);
  const publicAccessToken = randomPublicAccessToken();
  const payload = buildInvoicePayload({ invoiceNumber, publicAccessToken, monthlyRows, lineItems, totalExact });
  await db.collection('invoices').doc(invoiceNumber).set(payload);
  appendRegistryRow({ invoiceNumber, publicAccessToken });

  console.log('\nCreated draft invoice');
  console.log(`  Firestore: invoices/${invoiceNumber}`);
  console.log(`  Public review URL: ${BASE_URL}/invoice/${publicAccessToken}`);
  console.log(`  Registry updated: ${registryPath}`);
  await printReadback(db, invoiceNumber);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message || error}`);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
