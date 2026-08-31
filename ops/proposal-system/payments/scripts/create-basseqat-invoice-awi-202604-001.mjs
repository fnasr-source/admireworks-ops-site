/**
 * Create invoice AWI-202604-001 (Basseqat):
 * - Payment 2 of 2 from the original 72,000 EGP contract
 * - 36,000 EGP, due April 1, 2026 (past due)
 * - Payment via InstaPay + Banque Misr bank transfer
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

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
const BASSEQAT_CLIENT_ID = 'IWvO6Ct67XFWztaufyeT';

const invoiceData = {
    invoiceNumber: 'AWI-202604-001',
    clientId: BASSEQAT_CLIENT_ID,
    clientName: 'Basseqat — Eng. Khaled Nasseredin',
    currency: 'EGP',
    status: 'overdue',
    issuedAt: '2026-04-06',
    dueDate: '2026-04-01',
    paymentMethods: ['instapay', 'bank_transfer'],
    bankTransferDetails: {
        bankName: 'Banque Misr',
        accountName: 'Fouad Nasseredin',
        accountNumber: '8700324000000131',
        iban: 'EG300002087008700324000000131',
    },
    lineItems: [
        {
            description: 'Full Growth Partnership — Payment 2 of 2\n\nRemaining balance from the 72,000 EGP contract. Payment 1 of 36,000 EGP was received March 8, 2026 (AWI-202603-003).',
            qty: 1,
            rate: 36000,
            amount: 36000,
        },
    ],
    subtotal: 36000,
    tax: 0,
    totalDue: 36000,
    billingClarity: {
        title: 'What This Invoice Covers',
        dueNowLabel: 'Remaining 50% of the 72,000 EGP Full Growth Partnership contract',
        schedule: [
            { label: 'Payment 1 of 2 (AWI-202603-003)', value: '36,000 EGP — Paid ✓ March 8, 2026' },
            { label: 'Payment 2 of 2 (this invoice)', value: '36,000 EGP — Due April 1, 2026 (Past Due)' },
            { label: 'From May 1, 2026', value: '41,000 EGP/month ongoing retainer' },
        ],
        scopeIncluded: [
            'Full Growth Partnership services per original contract',
            'Direct response marketing execution',
            'Social media management',
            'Email campaigns and funnel support',
            'Multi-platform advertising management',
        ],
        scopeExcluded: [
            'Media spend paid directly by client',
        ],
    },
    notes: 'Second and final installment of the 72,000 EGP contract agreed in March 2026. First payment of 36,000 EGP was received March 8, 2026 (AWI-202603-003). Monthly retainer of 41,000 EGP begins May 1, 2026. Payment via InstaPay (admireworks@instapay) or Banque Misr bank transfer.',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function main() {
    // Check if already exists
    const existing = await db.collection('invoices')
        .where('invoiceNumber', '==', 'AWI-202604-001')
        .limit(1)
        .get();

    if (!existing.empty) {
        console.log('Invoice AWI-202604-001 already exists. Updating...');
        await existing.docs[0].ref.update({ ...invoiceData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
        await db.collection('invoices').doc('AWI-202604-001').set(invoiceData);
        console.log('Invoice AWI-202604-001 created.');
    }

    console.log('  Amount: 36,000 EGP (past due since April 1, 2026)');
    console.log('  Client: Basseqat (IWvO6Ct67XFWztaufyeT)');
    console.log('  Payment: InstaPay + Banque Misr bank transfer');
    console.log('  Portal: https://my.admireworks.com/invoice/AWI-202604-001');
}

main().catch(err => { console.error(err.message); process.exit(1); });
