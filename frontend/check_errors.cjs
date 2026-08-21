const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // also check if the body is completely empty or just white
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('BODY HTML LENGTH:', bodyHtml.length);
  
  await browser.close();
})();
