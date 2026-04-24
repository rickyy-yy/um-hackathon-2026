import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SESSION_COOKIE = 'eyJ1c2VySWQiOiJjbW9jZTB3MHMwMDAweHlkd2Y3c2hhN3BrIiwiaWF0IjoxNzc3MDA5NTMzNjAwfQ.6sHDoDVrYgOf9GJ--w0-hZ6i5dbbrqpNAxPvWdlNcmQ';
const REPORT_ID = 'cmoce1mhd00j1xydw8y9zp7j8';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

// Inject session cookie directly
await context.addCookies([{
  name: 'kira2je_session',
  value: SESSION_COOKIE,
  domain: 'localhost',
  path: '/',
}]);

const page = await context.newPage();

async function shot(name) {
  await page.screenshot({ path: `/tmp/walk_${name}.png`, fullPage: false });
  console.log(`screenshot: ${name}`);
}

// 1. Login page
await page.goto(BASE);
await page.waitForLoadState('networkidle');
await shot('01_login');

// 2. Go straight to dashboard with report
await page.goto(`${BASE}/dashboard?reportId=${REPORT_ID}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await shot('03_dashboard');

// 4. Scroll dashboard
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(500);
await shot('04_dashboard_scroll');

// 5. What-if page
await page.goto(`${BASE}/whatif`);
await page.waitForLoadState('networkidle');
await shot('05_whatif');

// 6. Upload photo page
await page.goto(`${BASE}/upload/photo`);
await page.waitForLoadState('networkidle');
await shot('06_upload_photo');

// 7. Upload CSV page
await page.goto(`${BASE}/upload/csv`);
await page.waitForLoadState('networkidle');
await shot('07_upload_csv');

// 8. Upload chat page
await page.goto(`${BASE}/upload/chat`);
await page.waitForLoadState('networkidle');
await shot('08_upload_chat');

await browser.close();
console.log('done');
