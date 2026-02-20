import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function inspectCarousel() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Listen for console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  // Listen for page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    const text = `[ERROR] ${error.message}`;
    pageErrors.push(text);
    console.error(text);
  });

  console.log('Navigating to https://dprk6phv6ds9x.cloudfront.net/...');
  await page.goto('https://dprk6phv6ds9x.cloudfront.net/', { waitUntil: 'networkidle' });

  // Take initial screenshot
  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: path.join(screenshotsDir, '1-initial-load.png'), fullPage: false });

  // Check for hero section
  console.log('\n=== Checking Hero Section ===');
  const heroSection = await page.locator('section').first();
  const heroVisible = await heroSection.isVisible();
  console.log(`Hero section visible: ${heroVisible}`);

  // Scroll down past hero
  console.log('\n=== Scrolling past hero section ===');
  await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight);
  });
  await page.waitForTimeout(1000);

  console.log('Taking screenshot after scroll...');
  await page.screenshot({ path: path.join(screenshotsDir, '2-after-scroll.png'), fullPage: false });

  // Check for carousel section
  console.log('\n=== Looking for Carousel Section ===');
  const carouselSection = await page.locator('section').nth(1);
  const carouselVisible = await carouselSection.isVisible().catch(() => false);
  console.log(`Second section visible: ${carouselVisible}`);

  if (carouselVisible) {
    const carouselHTML = await carouselSection.innerHTML();
    console.log('Second section HTML preview:', carouselHTML.substring(0, 500));

    // Look for images in the carousel
    const carouselImages = carouselSection.locator('img');
    const imageCount = await carouselImages.count();
    console.log(`Images found in second section: ${imageCount}`);

    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = carouselImages.nth(i);
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);
      console.log(`  Image ${i + 1}: src="${src}", alt="${alt}", naturalSize=${naturalWidth}x${naturalHeight}`);
    }
  }

  // Check what's between hero and "Services Provided"
  console.log('\n=== Checking sections order ===');
  const sections = page.locator('section');
  const sectionCount = await sections.count();
  console.log(`Total sections found: ${sectionCount}`);

  for (let i = 0; i < Math.min(sectionCount, 5); i++) {
    const section = sections.nth(i);
    const text = await section.textContent();
    const preview = text?.substring(0, 100).replace(/\s+/g, ' ').trim() || '';
    console.log(`  Section ${i + 1}: "${preview}..."`);
  }

  // Scroll to "Featured Projects" section
  console.log('\n=== Checking Featured Projects Section ===');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await page.waitForTimeout(1000);

  const featuredProjectsHeading = page.locator('text=Featured Projects').or(page.locator('text=Recent Work'));
  const featuredVisible = await featuredProjectsHeading.isVisible().catch(() => false);
  console.log(`Featured Projects section visible: ${featuredVisible}`);

  if (featuredVisible) {
    await featuredProjectsHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '3-featured-projects.png'), fullPage: false });

    // Check gallery cards
    const galleryCards = page.locator('[class*="card"], [class*="gallery"], [class*="project"]').locator('img');
    const cardImageCount = await galleryCards.count();
    console.log(`Gallery card images found: ${cardImageCount}`);

    for (let i = 0; i < Math.min(cardImageCount, 5); i++) {
      const img = galleryCards.nth(i);
      const src = await img.getAttribute('src');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);
      console.log(`  Card image ${i + 1}: src="${src}", naturalSize=${naturalWidth}x${naturalHeight}`);
    }
  }

  // Take full page screenshot
  console.log('\n=== Taking full page screenshot ===');
  await page.screenshot({ path: path.join(screenshotsDir, '4-full-page.png'), fullPage: true });

  // Report console messages and errors
  console.log('\n=== Console Messages ===');
  if (consoleMessages.length === 0) {
    console.log('No console messages captured');
  } else {
    consoleMessages.forEach(msg => console.log(msg));
  }

  console.log('\n=== Page Errors ===');
  if (pageErrors.length === 0) {
    console.log('No page errors captured');
  } else {
    pageErrors.forEach(err => console.error(err));
  }

  console.log('\n=== Screenshots saved to:', screenshotsDir, '===');
  console.log('Press Ctrl+C to close the browser...');

  // Keep browser open for manual inspection
  await page.waitForTimeout(60000);

  await browser.close();
}

inspectCarousel().catch(console.error);
