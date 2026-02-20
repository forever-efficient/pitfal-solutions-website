import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function diagnoseCarousel() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  console.log('Navigating to https://dprk6phv6ds9x.cloudfront.net/...');
  await page.goto('https://dprk6phv6ds9x.cloudfront.net/');
  
  console.log('Waiting 5 seconds for everything to load...');
  await page.waitForTimeout(5000);

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('\n=== Taking initial snapshot ===');
  await page.screenshot({ path: path.join(screenshotsDir, 'carousel-debug-1-initial.png'), fullPage: false });

  console.log('\n=== Executing diagnostic JavaScript ===');
  const diagnosticScript = `
(() => {
  // Find the carousel section (it's the section with bg-neutral-50 right after the hero)
  const sections = document.querySelectorAll('section');
  const results = {};
  
  // Check all sections
  results.sectionCount = sections.length;
  results.sections = Array.from(sections).map((s, i) => ({
    index: i,
    classes: s.className,
    height: s.getBoundingClientRect().height,
    top: s.getBoundingClientRect().top,
    bottom: s.getBoundingClientRect().bottom,
    width: s.getBoundingClientRect().width,
    left: s.getBoundingClientRect().left,
    right: s.getBoundingClientRect().right
  }));
  
  // Find the overflow-hidden div (carousel container)
  const overflowDivs = document.querySelectorAll('.overflow-hidden');
  results.overflowDivs = Array.from(overflowDivs).map(d => ({
    classes: d.className,
    rect: {
      top: d.getBoundingClientRect().top,
      bottom: d.getBoundingClientRect().bottom,
      left: d.getBoundingClientRect().left,
      right: d.getBoundingClientRect().right,
      width: d.getBoundingClientRect().width,
      height: d.getBoundingClientRect().height
    },
    computedOverflow: getComputedStyle(d).overflow,
    computedHeight: getComputedStyle(d).height,
    childCount: d.children.length
  }));
  
  // Find carousel images
  const carouselImgs = document.querySelectorAll('img[alt="Recent work"]');
  results.carouselImgCount = carouselImgs.length;
  
  if (carouselImgs.length > 0) {
    const firstImg = carouselImgs[0];
    const imgParent = firstImg.parentElement;
    const strip = imgParent?.parentElement;
    const container = strip?.parentElement;
    
    results.firstImg = {
      src: firstImg.src?.substring(0, 100),
      naturalWidth: firstImg.naturalWidth,
      naturalHeight: firstImg.naturalHeight,
      clientWidth: firstImg.clientWidth,
      clientHeight: firstImg.clientHeight,
      rect: {
        top: firstImg.getBoundingClientRect().top,
        bottom: firstImg.getBoundingClientRect().bottom,
        left: firstImg.getBoundingClientRect().left,
        right: firstImg.getBoundingClientRect().right,
        width: firstImg.getBoundingClientRect().width,
        height: firstImg.getBoundingClientRect().height
      },
      computedDisplay: getComputedStyle(firstImg).display,
      computedVisibility: getComputedStyle(firstImg).visibility,
      computedOpacity: getComputedStyle(firstImg).opacity,
      computedWidth: getComputedStyle(firstImg).width,
      computedHeight: getComputedStyle(firstImg).height,
      complete: firstImg.complete
    };
    
    results.imgParent = {
      classes: imgParent?.className,
      rect: imgParent ? {
        top: imgParent.getBoundingClientRect().top,
        bottom: imgParent.getBoundingClientRect().bottom,
        left: imgParent.getBoundingClientRect().left,
        right: imgParent.getBoundingClientRect().right,
        width: imgParent.getBoundingClientRect().width,
        height: imgParent.getBoundingClientRect().height
      } : null,
      computedHeight: imgParent ? getComputedStyle(imgParent).height : null,
      computedWidth: imgParent ? getComputedStyle(imgParent).width : null,
      computedOverflow: imgParent ? getComputedStyle(imgParent).overflow : null
    };
    
    results.strip = {
      classes: strip?.className,
      rect: strip ? {
        top: strip.getBoundingClientRect().top,
        bottom: strip.getBoundingClientRect().bottom,
        left: strip.getBoundingClientRect().left,
        right: strip.getBoundingClientRect().right,
        width: strip.getBoundingClientRect().width,
        height: strip.getBoundingClientRect().height
      } : null,
      computedWidth: strip ? getComputedStyle(strip).width : null,
      computedHeight: strip ? getComputedStyle(strip).height : null,
      computedAnimation: strip ? getComputedStyle(strip).animation : null,
      computedTransform: strip ? getComputedStyle(strip).transform : null,
      childCount: strip?.children.length
    };
    
    results.container = {
      classes: container?.className,
      rect: container ? {
        top: container.getBoundingClientRect().top,
        bottom: container.getBoundingClientRect().bottom,
        left: container.getBoundingClientRect().left,
        right: container.getBoundingClientRect().right,
        width: container.getBoundingClientRect().width,
        height: container.getBoundingClientRect().height
      } : null,
      computedOverflow: container ? getComputedStyle(container).overflow : null,
      computedHeight: container ? getComputedStyle(container).height : null
    };
  }
  
  return results;
})()
  `;

  const diagnosticResults = await page.evaluate(diagnosticScript);
  
  console.log('\n=== DIAGNOSTIC RESULTS ===');
  console.log(JSON.stringify(diagnosticResults, null, 2));

  // Save to file
  const resultsPath = path.join(screenshotsDir, 'carousel-diagnostic-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(diagnosticResults, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  console.log('\n=== Scrolling to carousel section ===');
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight);
  });
  await page.waitForTimeout(1000);

  console.log('Taking screenshot after scroll...');
  await page.screenshot({ path: path.join(screenshotsDir, 'carousel-debug-2-scrolled.png'), fullPage: false });

  // Take a screenshot highlighting the carousel area
  console.log('\n=== Highlighting carousel elements ===');
  await page.evaluate(() => {
    const carouselImgs = document.querySelectorAll('img[alt="Recent work"]');
    if (carouselImgs.length > 0) {
      const firstImg = carouselImgs[0];
      const container = firstImg.parentElement?.parentElement?.parentElement;
      if (container) {
        container.style.outline = '5px solid red';
        container.style.outlineOffset = '-5px';
      }
      
      // Highlight the strip
      const strip = firstImg.parentElement?.parentElement;
      if (strip) {
        strip.style.outline = '3px solid blue';
      }
      
      // Highlight first few images
      for (let i = 0; i < Math.min(5, carouselImgs.length); i++) {
        const img = carouselImgs[i] as HTMLElement;
        img.style.outline = '2px solid green';
      }
    }
  });

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'carousel-debug-3-highlighted.png'), fullPage: false });

  console.log('\n=== Taking full page screenshot ===');
  await page.screenshot({ path: path.join(screenshotsDir, 'carousel-debug-4-fullpage.png'), fullPage: true });

  console.log('\n=== All screenshots saved to:', screenshotsDir, '===');
  console.log('\nClosing browser in 5 seconds...');
  await page.waitForTimeout(5000);

  await browser.close();
}

diagnoseCarousel().catch(console.error);
