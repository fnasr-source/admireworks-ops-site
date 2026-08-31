/**
 * Update invoice AWI-202603-003 (Basseqat):
 * - Mark deposit1 (36,000 EGP) as paid on March 8, 2026
 * - Note that deposit2 (36,000 EGP) has been moved to AWI-202604-001
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

async function main() {
    console.log('Looking up AWI-202603-003...');
    const snap = await db.collection('invoices')
        .where('invoiceNumber', '==', 'AWI-202603-003')
        .limit(1)
        .get();

    if (snap.empty) {
        console.error('Invoice AWI-202603-003 not found in Firestore.');
        process.exit(1);
    }

    const docRef = snap.docs[0].ref;
    const existing = snap.docs[0].data();

    const updateData = {
        // Deposit 1: paid
        status: 'pending', // overall invoice remains pending until deposit2 also paid
        paidAt: null,      // not fully paid yet
        paymentSplit: {
            ...existing.paymentSplit,
            type: '2-payments',
            totalInvestment: 72000,
            deposit1: {
                amount: 36000,
                label: 'Payment 1 of 2 — Paid ✓',
                description: 'Received March 8, 2026',
                status: 'paid',
                paidAt: '2026-03-08',
            },
            deposit2: {
                amount: 36000,
                label: 'Payment 2 of 2 — Separate Invoice',
                description: 'Issued as AWI-202604-001 (Past Due)',
                status: 'separate_invoice',
                invoiceRef: 'AWI-202604-001',
            },
        },
        billingClarity: {
            title: 'Full Contract Payment Schedule',
            dueNowLabel: 'Payment 1 of 2 — received March 8, 2026',
            schedule: [
                { label: 'Payment 1 of 2 (this invoice)', value: '36,000 EGP — Paid ✓ March 8, 2026' },
                { label: 'Payment 2 of 2', value: '36,000 EGP — Issued as AWI-202604-001 (Past Due)' },
                { label: 'From May 1, 2026', value: '41,000 EGP/month ongoing retainer' },
            ],
            scopeIncluded: [
                'Full Growth Partnership — setup and Month 1 retainer',
                'Reply Management setup (waived as part of Early Partner offer)',
                'CRM System setup (40% off as part of Early Partner offer)',
                '1× UGC Video bonus',
            ],
            scopeExcluded: [
                'Media spend paid directly by client',
            ],
        },
        notes: 'Updated April 6, 2026: Payment 1 of 36,000 EGP confirmed received March 8, 2026. Payment 2 of 36,000 EGP is past due and has been issued as a separate invoice AWI-202604-001. Monthly retainer of 41,000 EGP begins May 1, 2026.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.update(updateData);
    console.log('AWI-202603-003 updated successfully.');
    console.log('  Deposit 1: 36,000 EGP — marked PAID (March 8, 2026)');
    console.log('  Deposit 2: 36,000 EGP — referenced to AWI-202604-001');
}

main().catch(err => { console.error(err.message); process.exit(1); });
