const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const content = fs.readFileSync(filePath, 'utf8');

console.log('==================================================');
console.log('Asteri Beauty Presentation Layout Verification');
console.log('==================================================');
console.log(`Target File: ${filePath}\n`);

// Helper to check if string exists in file (case-insensitive)
function checkKeyword(keyword) {
  const regex = new RegExp(keyword, 'i');
  return regex.test(content);
}

// 1. Verify CSS media queries
console.log('--- Checking Responsiveness Styles ---');
const media600 = /@media\s*\(\s*max-width\s*:\s*600px\s*\)/i.test(content);
const media360 = /@media\s*\(\s*max-width\s*:\s*360px\s*\)/i.test(content);

console.log(`[${media600 ? 'PASS' : 'FAIL'}] Media Query for 600px: ${media600 ? 'Found' : 'NOT Found'}`);
console.log(`[${media360 ? 'PASS' : 'FAIL'}] Media Query for 360px: ${media360 ? 'Found' : 'NOT Found'}`);

// 2. Verify existence of key sections and their dual headings
console.log('\n--- Checking Key Sections & Headings ---');

// Define expected sections, how to match them, and their Arabic heading class/type
const sections = [
  {
    name: 'Cover',
    pattern: /class="[^"]*cover[^"]*"/i,
    enTitlePattern: /<h1>Asteri Beauty<\/h1>/i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>أستيري بيوتي/i,
    arClass: '.arsub'
  },
  {
    name: 'Brand Philosophy',
    pattern: /The Vision/i,
    enTitlePattern: /The Architecture of Trust\./i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>هيكل الثقة/i,
    arClass: '.arsub'
  },
  {
    name: '3-tier community diagram',
    pattern: /class="diagram-container"/i,
    enTitlePattern: /The 3-Tier Community Strategy\./i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>استراتيجية مجتمع صناع الجمال/i,
    arClass: '.arsub'
  },
  {
    name: 'KSA Bottlenecks',
    pattern: /Two bottlenecks are stalling KSA brands/i,
    enTitlePattern: /Two bottlenecks are stalling KSA brands\./i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>عقبتان تعيقان/i,
    arClass: '.arsub'
  },
  {
    name: 'Competitor Analysis',
    pattern: /competitor|competition|competitors/i,
    enTitlePattern: null,
    arTitlePattern: null,
    arClass: '.arsub'
  },
  {
    name: 'Implementation Roadmap',
    pattern: /class="road"/i,
    enTitlePattern: /Phased on purpose\./i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>مراحل التنفيذ/i,
    arClass: '.arsub'
  },
  {
    name: 'Sustainability',
    pattern: /The Sustainability &amp; Retention Pillars/i,
    enTitlePattern: /The Sustainability &amp; Retention Pillars/i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>ركائز الاستدامة/i,
    arClass: '.arsub'
  },
  {
    name: 'Application Workflow',
    pattern: /class="steps"|Application Workflow/i,
    enTitlePattern: /Four steps to community integration\./i,
    arTitlePattern: /class="arsub[^"]*ar"[^>]*>أربع خطوات/i,
    arClass: '.arsub'
  },
  {
    name: 'CTA to book whiteboarding',
    pattern: /whiteboard|whiteboarding|session/i,
    enTitlePattern: null,
    arTitlePattern: null,
    arClass: null
  }
];

let allPassed = true;

sections.forEach(sec => {
  console.log(`\nSection: ${sec.name}`);
  const hasSection = sec.pattern ? sec.pattern.test(content) : false;
  console.log(`  - Section Presence: [${hasSection ? 'PASS' : 'FAIL'}]`);
  
  if (!hasSection) {
    allPassed = false;
    return;
  }

  if (sec.enTitlePattern) {
    const hasEnHeading = sec.enTitlePattern.test(content);
    console.log(`  - English Heading: [${hasEnHeading ? 'PASS' : 'FAIL'}]`);
    if (!hasEnHeading) allPassed = false;
  }

  if (sec.arTitlePattern) {
    const hasArHeading = sec.arTitlePattern.test(content);
    console.log(`  - Arabic Heading (${sec.arClass}): [${hasArHeading ? 'PASS' : 'FAIL'}]`);
    if (!hasArHeading) allPassed = false;
  }
});

console.log('\n==================================================');
console.log(`Verification Status: ${allPassed ? 'ALL PASSED' : 'SOME CHECKS FAILED'}`);
console.log('==================================================');

process.exit(allPassed ? 0 : 1);
