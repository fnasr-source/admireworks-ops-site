/**
 * Create Egada client and invoice AWI-202604-002:
 * - New client: Egada (عبد الرحمن ماهر), Egyptian market, ad management
 * - Invoice: 6,350 EGP/month (50% of 12,700 EGP for 6 months), April 2026
 * - Arabic locale, InstaPay payment
 *
 * Already executed April 6, 2026. Script kept for reference.
 * Egada Client ID: NAS7Pf4LvNiYPB1aVVIr
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
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
}
const db = admin.firestore();

// Egada Client ID (already created)
const EGADA_CLIENT_ID = 'NAS7Pf4LvNiYPB1aVVIr';

const invoiceData = {
    invoiceNumber: 'AWI-202604-002',
    clientId: EGADA_CLIENT_ID,
    clientName: 'Egada — عبد الرحمن ماهر',
    currency: 'EGP',
    locale: 'ar',
    status: 'pending',
    issuedAt: '2026-04-06',
    dueDate: '2026-04-10',
    paymentMethods: ['instapay'],
    lineItems: [
        {
            description: 'إدارة الإعلانات — أبريل 2026 (الشهر الأول من 6 أشهر)\n\nالسعر الأصلي: 12,700 ج.م. | سعر مخفض بنسبة 50% لمدة 6 أشهر (أبريل – سبتمبر 2026).',
            qty: 1,
            rate: 6350,
            amount: 6350,
        },
    ],
    subtotal: 6350,
    tax: 0,
    totalDue: 6350,
    billingClarity: {
        title: 'تفاصيل الفاتورة',
        dueNowLabel: 'إدارة الإعلانات — أبريل 2026 (سعر مخفض)',
        schedule: [
            { label: 'أبريل – سبتمبر 2026', value: '6,350 ج.م./شهر (6 أشهر بخصم 50%)' },
            { label: 'من أكتوبر 2026', value: '12,700 ج.م./شهر (السعر الكامل)' },
        ],
        scopeIncluded: [
            'إدارة حملات الإعلانات الرقمية',
            'تحسين أداء الحملات بشكل شهري',
            'تقارير الأداء الدورية',
            'إدارة الميزانية الإعلانية',
        ],
        scopeExcluded: ['ميزانية الإعلانات (تُدفع مباشرةً من العميل)'],
    },
    notes: 'سعر مخفض بنسبة 50% لمدة 6 أشهر (أبريل – سبتمبر 2026). السعر الكامل 12,700 ج.م./شهر يسري من أكتوبر 2026.',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function main() {
    const existing = await db.collection('invoices').where('invoiceNumber', '==', 'AWI-202604-002').limit(1).get();
    if (!existing.empty) {
        await existing.docs[0].ref.update({ ...invoiceData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log('AWI-202604-002 updated.');
    } else {
        await db.collection('invoices').doc('AWI-202604-002').set(invoiceData);
        console.log('AWI-202604-002 created.');
    }
    console.log('Portal: https://my.admireworks.com/invoice/AWI-202604-002');
}

main().catch(err => { console.error(err.message); process.exit(1); });
