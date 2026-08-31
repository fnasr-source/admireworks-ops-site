/**
 * Send the Genco invoice (AWI-202604-H82Z3) by email via Resend.
 *
 * Two modes:
 *   --preview    → sends ONLY to fnasr@admireworks.com so Fouad can review
 *                  before going to the client. No CCs.
 *   --final      → sends to Ahmed Kotb <info@gencostores.com> with CCs to
 *                  cdarlucio, fnasr, eali @admireworks.com.
 *
 * Usage:
 *   node ops/proposal-system/payments/scripts/send-genco-invoice-email.mjs --preview
 *   node ops/proposal-system/payments/scripts/send-genco-invoice-email.mjs --final
 *
 * Mirrors the HTML template used by /api/emails/send-invoice so the preview
 * is bit-for-bit what the client would receive (including Egypt InstaPay
 * settlement block and the term-toggle hint).
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../node_modules/firebase-admin'));
const { Resend } = require(join(__dirname, '../../../../node_modules/resend'));

const sa = JSON.parse(readFileSync(join(__dirname, '../../../../firebase/service-account.json'), 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
}
const db = admin.firestore();

const INVOICE_ID = 'AWI-202604-H82Z3';
const PRODUCTION_ORIGIN = 'https://my.admireworks.com';
const FROM_EMAIL = 'Admireworks <hello@admireworks.com>';

const PREVIEW_TO = ['fnasr@admireworks.com'];
const PREVIEW_CC = [];

const FINAL_TO = ['info@gencostores.com'];
const FINAL_CC = ['cdarlucio@admireworks.com', 'fnasr@admireworks.com', 'eali@admireworks.com'];

function parseMode() {
    const args = process.argv.slice(2);
    if (args.includes('--preview')) return 'preview';
    if (args.includes('--final')) return 'final';
    throw new Error('Specify --preview or --final');
}

async function getResendKey() {
    const snap = await db.collection('systemConfig').doc('secrets').get();
    const key = snap.data()?.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not found in systemConfig/secrets');
    return key;
}

async function getInstapaySettings() {
    const snap = await db.collection('systemConfig').doc('finance').get();
    return snap.data()?.paymentInstructionsByRegion?.egypt?.instapay || {};
}

function buildEmailHtml({ invoice, paymentUrl, settlement, instapay }) {
    const enabledMethods = invoice.paymentMethods?.length ? invoice.paymentMethods : ['instapay'];
    const methodSummary = enabledMethods.includes('instapay') && enabledMethods.includes('stripe')
        ? 'Card or InstaPay'
        : enabledMethods.includes('instapay') ? 'InstaPay' : 'Card';
    const settlementSummary = settlement
        ? `<div style="margin:12px 0 0;padding-top:12px;border-top:1px solid #bfdbfe;color:#1f2937;">
              <div style="font-size:13px;line-height:1.7;">
                Contract amount: <strong>${Number(invoice.totalDue || 0).toLocaleString()} USD</strong><br>
                InstaPay settlement: <strong>${settlement.payableAmountEgp.toLocaleString()} EGP</strong><br>
                Rate used: 1 USD = ${settlement.rateUsed.toFixed(2)} EGP<br>
                Source: <a href="${settlement.sourceUrl}" style="color:#001a70;font-weight:700;">${settlement.sourceUrl.replace(/^https?:\/\//, '')}</a> (${settlement.sourceDate})
              </div>
            </div>`
        : '';
    const instapayHtml = enabledMethods.includes('instapay')
        ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 18px;margin:24px 0;">
            <p style="margin:0 0 8px;font-weight:700;color:#1e3a8a;">InstaPay</p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
              Account: <strong>${instapay.instapayId || 'admireworks@instapay'}</strong><br>
              Name: <strong>${instapay.accountName || 'Fouad Nasseredin'}</strong><br>
              ${instapay.paymentUrl ? `<a href="${instapay.paymentUrl}" style="color:#001a70;font-weight:700;">${instapay.paymentUrlLabel || 'Pay via InstaPay'}</a>` : ''}
            </p>
            ${settlementSummary}
          </div>`
        : '';
    const termHintHtml = invoice.paymentTermCommitment?.availableTerms?.length > 1
        ? `<div style="background:#fafbff;border:1px solid #e5e9f5;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
            <p style="margin:0 0 4px;font-weight:700;color:#001a70;font-size:14px;">Choose your payment term on the invoice page</p>
            <p style="margin:0;color:#374151;font-size:13px;line-height:1.5;">Commit for 1 / 3 / 6 months and save up to 10%. Your choice locks in when you pay.</p>
          </div>`
        : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f7f8fa;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#001a70;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.1);padding:8px 16px;border-radius:8px;">
        <span style="color:#cc9f53;font-weight:800;font-size:20px;">AW</span>
      </div>
      <h1 style="color:#ffffff;margin:12px 0 0;font-size:18px;font-weight:700;">Invoice from Admireworks</h1>
    </div>
    <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">Dear ${invoice.clientName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Please find below the details for your invoice:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Invoice Number</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Amount Due</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;font-size:18px;">${invoice.totalDue.toLocaleString()} ${invoice.currency}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Due Date</td><td style="padding:6px 0;text-align:right;color:#111827;">${invoice.dueDate}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-weight:600;">Payment Method</td><td style="padding:6px 0;text-align:right;color:#111827;">${methodSummary}</td></tr>
        </table>
      </div>
      ${termHintHtml}
      ${paymentUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${paymentUrl}" style="display:inline-block;background:#001a70;color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">View Full Invoice</a></div>` : ''}
      ${instapayHtml}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">If you have any questions, please reply to this email or contact us at hello@admireworks.com</p>
    </div>
    <div style="padding:20px;text-align:center;font-size:12px;color:#9ca3af;">
      <p style="margin:0;">Admireworks — Admirable Venture Services</p>
      <p style="margin:4px 0 0;">P.O.Box/36846, DXB, UAE · (+971) 4295 8666</p>
    </div>
  </div>
</body></html>`;
}

function resolveSettlement(invoice) {
    const snap = invoice.exchangeRateSnapshot;
    if (!snap?.used) return null;
    return {
        payableAmountEgp: invoice.instapayAmountOverrideEgp || snap.roundedAmount,
        rateUsed: Number(snap.used),
        roundedIncrementEgp: snap.roundingIncrementEgp || 50,
        sourceUrl: snap.sourceUrl,
        sourceDate: snap.date,
    };
}

async function main() {
    const mode = parseMode();
    const isPreview = mode === 'preview';
    console.log(`Mode: ${mode.toUpperCase()}\n`);

    const invSnap = await db.collection('invoices').doc(INVOICE_ID).get();
    if (!invSnap.exists) throw new Error(`Invoice ${INVOICE_ID} not found`);
    const invoice = invSnap.data();
    const instapay = await getInstapaySettings();
    const settlement = resolveSettlement(invoice);
    const paymentUrl = `${PRODUCTION_ORIGIN}/invoice/${invoice.publicAccessToken}`;

    const html = buildEmailHtml({ invoice, paymentUrl, settlement, instapay });
    const subject = isPreview
        ? `[PREVIEW] Invoice ${invoice.invoiceNumber} — ${invoice.totalDue.toLocaleString()} ${invoice.currency} Due`
        : `Invoice ${invoice.invoiceNumber} — ${invoice.totalDue.toLocaleString()} ${invoice.currency} Due`;

    const to = isPreview ? PREVIEW_TO : FINAL_TO;
    const cc = isPreview ? PREVIEW_CC : FINAL_CC;

    console.log(`From:    ${FROM_EMAIL}`);
    console.log(`To:      ${to.join(', ')}`);
    if (cc.length) console.log(`CC:      ${cc.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Invoice: ${invoice.invoiceNumber} (${invoice.totalDue} ${invoice.currency})`);
    console.log(`Link:    ${paymentUrl}`);
    if (settlement) console.log(`EGP:     ${settlement.payableAmountEgp.toLocaleString()} EGP at ${settlement.rateUsed} EGP/USD`);
    console.log('');

    const resend = new Resend(await getResendKey());
    const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        ...(cc.length > 0 ? { cc } : {}),
        subject,
        html,
    });

    if (result.error) {
        console.error('Resend error:', result.error);
        process.exit(1);
    }

    console.log(`✓ Sent. Resend message id: ${result.data?.id}`);

    if (!isPreview) {
        await invSnap.ref.update({
            emailSent: true,
            emailSentAt: new Date().toISOString(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('  invoice.emailSent flagged on Firestore.');
    } else {
        console.log('  (preview — not flagging emailSent on the invoice doc)');
    }
}

main().catch((err) => { console.error(err); process.exit(1); });
