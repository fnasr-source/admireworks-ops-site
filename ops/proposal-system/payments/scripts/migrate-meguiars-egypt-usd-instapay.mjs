import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(join(__dirname, '../../../../firebase/node_modules/firebase-admin'))
const saPath = join(__dirname, '../../../../firebase/service-account.json')

const INVOICE_NUMBER = 'AWI-202603-004'
const INVOICE_PUBLIC_TOKEN = 'aAaVAfw-009i54FQB4nXXjTiPUDRJhoW'
const PROPOSAL_NUMBER = 'AWP-EG-0LVG-5SS'
const PROPOSAL_URL = 'https://ops.admireworks.com/ops/proposal-system/_Outgoing/AWP-EG-0LVG-5SS/one-page.html'
const PROPOSAL_PORTAL_URL = 'https://my.admireworks.com/proposal/AWP-EG-0LVG-5SS'
const INVOICE_PORTAL_URL = `https://my.admireworks.com/invoice/${INVOICE_PUBLIC_TOKEN}`
const REAL_EGP_URL = 'https://realegp.com/usd'
const REFRESH_INTERVAL_DAYS = 3
const ROUNDING_INCREMENT_EGP = 50
const VALID_UNTIL = '2026-04-20'

throw new Error('Superseded by firebase/update-meguiars-egypt-paid-state.mjs. Do not reapply the old USD/RealEGP settlement migration.')

if (!admin.apps.length) {
  const sa = JSON.parse(readFileSync(saPath, 'utf8'))
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: `${sa.project_id}.firebasestorage.app`,
  })
}

const db = admin.firestore()

function roundToNearestIncrement(amount, increment) {
  return Math.round(amount / increment) * increment
}

function getNextRefreshAt(fromIso, days) {
  const next = new Date(fromIso)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString()
}

async function fetchEgyptQuote(baseAmountUsd) {
  const response = await fetch(REAL_EGP_URL, {
    headers: {
      'User-Agent': 'Admireworks Finance Bot/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch realegp.com/usd (${response.status})`)
  }

  const html = await response.text()
  const rateMatch = html.match(/سعر السوق<\/div>\s*<div[^>]*>\s*([0-9]+(?:\.[0-9]+)?)/)
    || html.match(/<div class="big-price">\s*([0-9]+(?:\.[0-9]+)?)\s*<\/div>/)
  if (!rateMatch) {
    throw new Error('Unable to parse market rate from realegp.com/usd')
  }

  const timeMatch = html.match(/<time[^>]*dateTime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/i)
  const fetchedAt = new Date().toISOString()
  const rate = Number(rateMatch[1])
  const convertedAmount = Number((baseAmountUsd * rate).toFixed(2))
  const roundedAmount = roundToNearestIncrement(convertedAmount, ROUNDING_INCREMENT_EGP)

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
    baseAmountUsd,
    convertedAmount,
    roundedAmount,
  }
}

async function upsertProposal(invoiceId) {
  const proposalQuery = await db.collection('proposals').where('proposalNumber', '==', PROPOSAL_NUMBER).limit(1).get()
  const payload = {
    clientId: 'MEG-001',
    clientName: "Meguiar's Egypt",
    proposalNumber: PROPOSAL_NUMBER,
    status: 'ready',
    validUntil: VALID_UNTIL,
    recommendedOption: 'Agreed launch structure',
    documentUrl: PROPOSAL_URL,
    totalValue: 1280,
    currency: 'USD',
    linkedInvoiceId: invoiceId,
    sourceMetadata: {
      type: 'invoice_backfill',
      invoiceId,
      invoiceNumber: INVOICE_NUMBER,
      proposalNumber: PROPOSAL_NUMBER,
    },
    notes: 'Meguiar’s Egypt USD contract structure with Egypt InstaPay EGP settlement snapshot.',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  if (proposalQuery.empty) {
    const ref = await db.collection('proposals').add({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return ref.id
  }

  const ref = proposalQuery.docs[0].ref
  await ref.set(payload, { merge: true })
  return ref.id
}

async function main() {
  const invoiceQuery = await db.collection('invoices').where('invoiceNumber', '==', INVOICE_NUMBER).limit(1).get()
  if (invoiceQuery.empty) {
    throw new Error(`Invoice ${INVOICE_NUMBER} not found`)
  }

  const invoiceDoc = invoiceQuery.docs[0]
  const quote = await fetchEgyptQuote(1280)
  const proposalId = await upsertProposal(invoiceDoc.id)

  await db.collection('systemConfig').doc('finance').set({
    paymentInstructionsByRegion: {
      egypt: {
        instapay: {
          accountName: 'Fouad Nasseredin',
          instapayId: 'admireworks@instapay',
          paymentUrl: 'https://ipn.eg/S/admireworks/instapay/5A1jri',
          paymentUrlLabel: 'Pay via InstaPay',
        },
      },
    },
    egyptInstapayFx: {
      sourceUrl: REAL_EGP_URL,
      sourceKind: 'realegp_market',
      refreshIntervalDays: REFRESH_INTERVAL_DAYS,
      roundingIncrementEgp: ROUNDING_INCREMENT_EGP,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  await invoiceDoc.ref.set({
    invoiceNumber: INVOICE_NUMBER,
    clientId: 'MEG-001',
    clientName: "Meguiar's Egypt",
    currency: 'USD',
    status: 'pending',
    lineItems: [
      {
        description: 'E-Commerce Store Build & Launch — Agreed Start Price (One-Time)',
        qty: 1,
        rate: 950,
        amount: 950,
      },
      {
        description: 'Growth Management & Ads Oversight — Month 1 (Monthly Upfront)',
        qty: 1,
        rate: 680,
        amount: 330,
      },
      {
        description: 'Commercial note (reference): Ongoing management after Month 1 is reviewed and invoiced separately. Egypt InstaPay settlement is shown in EGP from the current stored market-rate snapshot.',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ],
    subtotal: 1280,
    tax: 0,
    totalDue: 1280,
    discount: admin.firestore.FieldValue.delete(),
    discountLabel: admin.firestore.FieldValue.delete(),
    paymentRegion: 'egypt',
    paymentMethods: ['instapay', 'stripe'],
    paymentVerificationState: 'none',
    paymentTerms: 'USD contract invoice. Egypt InstaPay settlement is shown in EGP from the stored market-rate snapshot and rounded to the nearest 50 EGP.',
    billingClarity: {
      title: 'What This Payment Covers',
      dueNowLabel: 'Due now to begin build + discounted Month 1 management',
      schedule: [
        {
          label: 'Month 1 management',
          value: '330 USD discounted from 680 USD launch month fee',
        },
        {
          label: 'Egypt InstaPay settlement',
          value: `${quote.roundedAmount.toLocaleString()} EGP at 1 USD = ${quote.used.toFixed(2)} EGP`,
        },
      ],
      scopeIncluded: [
        'E-commerce store build and launch setup',
        'Month 1 growth management and ads oversight',
        'Tracking, reporting, and performance visibility',
        'Coordination with Promolinks / content side on performance requirements',
      ],
      scopeExcluded: [
        'Ad spend is paid directly by the client',
        'Content production / filming execution is not included in this amount',
        'Ongoing management after Month 1 is reviewed and invoiced separately',
      ],
    },
    notes: `USD contract structure applied. Egypt InstaPay settlement snapshot: ${quote.roundedAmount.toLocaleString()} EGP at 1 USD = ${quote.used.toFixed(2)} EGP (realegp.com/usd).`,
    exchangeRateSnapshot: quote,
    exchangeRateUsed: quote.used,
    exchangeRateDate: quote.date,
    exchangeRateSourceUrl: quote.sourceUrl,
    exchangeRateLastUpdatedAt: quote.fetchedAt,
    exchangeRateNextRefreshAt: getNextRefreshAt(quote.fetchedAt, REFRESH_INTERVAL_DAYS),
    exchangeRateRefreshIntervalDays: REFRESH_INTERVAL_DAYS,
    exchangeRateSourceKind: quote.sourceKind,
    pricingRule: quote.pricingRule,
    publicAccessToken: INVOICE_PUBLIC_TOKEN,
    publicAccessEnabledAt: admin.firestore.FieldValue.serverTimestamp(),
    stripePaymentIntentId: admin.firestore.FieldValue.delete(),
    stripePaymentLinkId: admin.firestore.FieldValue.delete(),
    stripePaymentLinkUrl: admin.firestore.FieldValue.delete(),
    dueDate: VALID_UNTIL,
    promotionExpiry: VALID_UNTIL,
    proposalNumber: PROPOSAL_NUMBER,
    sourceMetadata: {
      sourceType: 'proposal',
      proposalId,
      proposalNumber: PROPOSAL_NUMBER,
      sourceLabel: `${PROPOSAL_NUMBER} · Agreed launch structure`,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  console.log(JSON.stringify({
    invoiceId: invoiceDoc.id,
    proposalId,
    invoiceUrl: INVOICE_PORTAL_URL,
    proposalUrl: PROPOSAL_PORTAL_URL,
    staticProposalUrl: PROPOSAL_URL,
    marketRate: quote.used,
    roundedInstapayAmountEgp: quote.roundedAmount,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
