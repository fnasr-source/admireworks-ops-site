/**
 * Update invoice AWI-202603-001 (RQM Group) to March-only billing:
 * - Prorated March 1-12, 2026 service period only
 * - April 2026 not billed (work paused, resumes May 2026)
 *
 * Uses the workspace Firebase service account explicitly so the update
 * never depends on an interactive local login.
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
const invoiceRef = db.collection('invoices').doc('AWI-202603-001');

const monthlyRetainer = 5500;
const proratedMarchAmountRaw = (monthlyRetainer / 31) * 12;
const proratedMarchAmount = Math.round(proratedMarchAmountRaw);

const updateData = {
    clientId: 'RQM-001',
    clientName: 'RQM Group',
    invoiceNumber: 'AWI-202603-001',
    issuedAt: '2026-03-13',
    dueDate: '2026-03-31',
    currency: 'AED',
    status: 'pending',
    lineItems: [
        {
            description: 'Full Marketing Retainer — Prorated service period for March 1–12, 2026 (12 active days before agreed pause). Calculated as 12/31 of the monthly retainer.',
            qty: 1,
            rate: proratedMarchAmount,
            amount: proratedMarchAmount,
        },
    ],
    subtotal: proratedMarchAmount,
    tax: 0,
    totalDue: proratedMarchAmount,
    billingClarity: {
        title: 'What This Invoice Covers',
        dueNowLabel: 'Prorated March 1–12, 2026 services only',
        schedule: [
            {
                label: 'March 2026 coverage',
                value: `${proratedMarchAmount} AED for 12 active days`,
            },
            {
                label: 'April 2026',
                value: 'Not billed — work paused for the month',
            },
            {
                label: 'Services resume',
                value: 'May 2026',
            },
        ],
        scopeIncluded: [
            'Direct response marketing execution',
            'Social media management',
            'Email campaigns and funnel support',
            'Multi-platform advertising management',
            'Ongoing performance coordination for RQM Group',
        ],
        scopeExcluded: [
            'Media spend paid directly by the client',
            'April 2026 (work paused)',
        ],
    },
    notes: 'Updated April 5, 2026: Invoice revised to cover the prorated March 1–12, 2026 service period only. April 2026 is not billed as work is paused for the month. Services resume May 2026 at the standard monthly retainer of 5,500 AED.',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function main() {
    console.log('Updating invoice AWI-202603-001...');
    console.log(`Service account: ${serviceAccountPath}`);

    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
        console.error('Invoice AWI-202603-001 was not found in Firestore.');
        process.exit(1);
    }

    await invoiceRef.update(updateData);

    console.log('Invoice updated successfully.');
    console.log(`Prorated March 1-12 amount: ${proratedMarchAmount} AED`);
    console.log('April 2026: not billed (work paused)');
    console.log(`Total due: ${proratedMarchAmount} AED`);
    console.log('Due date: 2026-03-31');
    console.log('Portal URL: https://my.admireworks.com/invoice/AWI-202603-001');
}

main().catch((error) => {
    console.error('Failed to update invoice:', error.message);
    process.exit(1);
});
