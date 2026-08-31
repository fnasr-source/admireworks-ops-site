/**
 * Strip "rounded to nearest 50 EGP" language from the Genco invoice fields
 * that get rendered on the public page and in follow-up emails. Rounding is
 * still applied internally; we just don't surface it to the client.
 *
 * Touches: pricingRule, notes, paymentTerms, exchangeRateSnapshot.pricingRule
 * on invoices/AWI-202604-H82Z3.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(join(__dirname, '../../../../node_modules/firebase-admin'));

const sa = JSON.parse(readFileSync(join(__dirname, '../../../../firebase/service-account.json'), 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
const db = admin.firestore();

const strip = (text) => String(text || '')
    // English
    .replace(/,?\s*rounded to the nearest \d+\s*EGP\.?/gi, '')
    .replace(/,?\s*rounded to nearest \d+\s*EGP\.?/gi, '')
    // Arabic: "مع تقريب لأقرب X جنيه"
    .replace(/\s*مع تقريب لأقرب \d+ جنيه\.?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const ref = db.collection('invoices').doc('AWI-202604-H82Z3');
const snap = await ref.get();
const d = snap.data();

const update = {
    pricingRule: strip(d.pricingRule) || admin.firestore.FieldValue.delete(),
    paymentTerms: strip(d.paymentTerms),
    notes: (d.notes || '').split('\n').map((line) => strip(line)).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};
if (d.exchangeRateSnapshot?.pricingRule) {
    update['exchangeRateSnapshot.pricingRule'] = strip(d.exchangeRateSnapshot.pricingRule) || admin.firestore.FieldValue.delete();
}

await ref.update(update);

console.log('Stripped rounding mentions from AWI-202604-H82Z3');
console.log('  pricingRule      →', typeof update.pricingRule === 'string' ? `"${update.pricingRule}"` : '(removed)');
console.log('  paymentTerms     → "' + update.paymentTerms + '"');
console.log('  snapshot rule    →', typeof update['exchangeRateSnapshot.pricingRule'] === 'string' ? `"${update['exchangeRateSnapshot.pricingRule']}"` : '(removed or unchanged)');
console.log('  notes (first 2 lines):');
update.notes.split('\n').slice(0, 2).forEach((l) => console.log('    ' + l));
process.exit(0);
