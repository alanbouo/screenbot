const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Generate unique timestamped directory
function generateTimestampedOutputDir(baseDir = './screenshots') {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')        // Replace colons and dots with dashes
    .replace('T', '_')           // Replace T with underscore
    .slice(0, 19);               // Keep only YYYY-MM-DD_HH-MM-SS format

  return path.join(baseDir, `capture_${timestamp}`);
}

// Viewport presets for different device sizes
const VIEWPORT_PRESETS = {
  'desktop': { width: 1920, height: 1080 },
  'desktop-hd': { width: 1366, height: 768 },
  'laptop': { width: 1280, height: 800 },
  'tablet': { width: 768, height: 1024 },
  'tablet-landscape': { width: 1024, height: 768 },
  'mobile': { width: 375, height: 812 }, // iPhone X
  'mobile-large': { width: 414, height: 896 }, // iPhone XR
  'mobile-small': { width: 320, height: 568 }  // iPhone SE
};

function toBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = value.toString().trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function parsePages(value, currentValue) {
  if (value === undefined || value === null || value === '') {
    return currentValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < -1) {
    console.error('--pages must be a positive number or -1 for unlimited');
    process.exit(1);
  }

  if (parsed > 50 && parsed !== -1) {
    console.warn('⚠️ Warning: Capturing more than 50 pages may generate significant traffic and take a long time.');
  }

  return parsed;
}

// Parse command line arguments and environment variables
function parseArgs() {
  const args = process.argv.slice(2);
  const env = process.env;

  let url = env.TARGET_URL || null;
  let outputDir = env.OUTPUT_DIR || null; // null means use timestamped directory
  let pagesToCapture = parsePages(env.PAGES, 5);
  const envCrawl = toBoolean(env.CRAWL, false);
  let crawlMode = envCrawl;
  let headless = toBoolean(env.HEADLESS, true);
  const envDebug = toBoolean(env.DEBUG, false);
  if (envDebug) {
    headless = false;
    console.log('🔍 Debug mode: Enabled via environment variable');
  }

  let customOutputDir = Boolean(outputDir);
  let viewportPreset = env.VIEWPORT || 'desktop';

  if (envCrawl) {
    console.log('🕷️ Crawler mode activated via environment variable - will capture ALL pages found on the site');
  }

  let startIndex = 0;
  if (args[startIndex] && !args[startIndex].startsWith('--')) {
    url = args[startIndex];
    startIndex += 1;
  }

  for (let i = startIndex; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        if (args[i + 1]) {
          url = args[i + 1];
          i++;
        }
        break;
      case '--output':
        if (args[i + 1]) {
          outputDir = args[i + 1];
          customOutputDir = true;
          i++;
        }
        break;
      case '--pages':
        if (args[i + 1]) {
          pagesToCapture = parsePages(args[i + 1], pagesToCapture);
          i++;
        }
        break;
      case '--crawl':
        crawlMode = true;
        console.log('🕷️ Crawler mode activated - will capture ALL pages found on the site');
        break;
      case '--headless':
        headless = true; // Override to ensure headless is true
        break;
      case '--debug':
        headless = false; // Debug mode - keep browser visible
        console.log('🔍 Debug mode: Browser will be visible for troubleshooting');
        break;
      case '--viewport':
        if (args[i + 1] && VIEWPORT_PRESETS[args[i + 1]]) {
          viewportPreset = args[i + 1];
          i++;
        } else {
          console.error(`❌ Invalid viewport preset. Available presets: ${Object.keys(VIEWPORT_PRESETS).join(', ')}`);
          process.exit(1);
        }
        break;
    }
  }

  if (!VIEWPORT_PRESETS[viewportPreset]) {
    console.warn(`❔ Unknown viewport preset "${viewportPreset}". Falling back to "desktop".`);
    viewportPreset = 'desktop';
  }

  if (!url) {
    console.error('Usage: node screenshot-bot.js <url> [--output <directory>] [--pages <number>] [--crawl] [--headless] [--viewport <preset>]');
    console.error('Environment variables: TARGET_URL, OUTPUT_DIR, PAGES, CRAWL, HEADLESS, DEBUG, VIEWPORT');
    console.error('Available viewport presets: ' + Object.keys(VIEWPORT_PRESETS).join(', '));
    process.exit(1);
  }

  return { 
    url, 
    outputDir, 
    pagesToCapture, 
    crawlMode, 
    headless, 
    customOutputDir, 
    viewport: VIEWPORT_PRESETS[viewportPreset],
    viewportName: viewportPreset
  };
}

// Ensure output directory exists
async function ensureOutputDir(dir) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create output directory: ${error.message}`);
    throw error;
  }
}

// Remove cookie banners and GDPR elements
async function removeCookieBanners(page) {
  try {
    await page.evaluate(() => {
      // Hide common cookie banner selectors
      const cookieSelectors = [
        '[data-testid="cookie-banner"]',
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[class*="consent"]',
        '[id*="gdpr"]',
        '[class*="gdpr"]',
        'button[id*="accept"]',
        'button[class*="accept"]',
        'button[id*="agree"]',
        'button[class*="agree"]',
        '.fc-consent-root',  // Facebook consent
        '#cmp-container',    //cmp banner
        '.cookie-banner',
        '.consent-banner',
        '.gdpr-banner'
      ];

      cookieSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none !important';
          element.style.visibility = 'hidden !important';
          element.style.opacity = '0 !important';
        });
      });

      // Hide GDPR consent banners by text content
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        if (text.includes('accept') && text.includes('cookie') ||
            text.includes('consent') && text.includes('data') ||
            text.includes('gdpr') && text.includes('privacy')) {
          element.style.display = 'none !important';
        }
      });

      // Hide fixed/absolute positioned elements that might be cookies
      const allFixedElements = document.querySelectorAll('*');
      allFixedElements.forEach(element => {
        const computedStyle = getComputedStyle(element);
        if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
          const rect = element.getBoundingClientRect();
          // If element is at bottom of page and small height, probably a banner
          if (rect.bottom > window.innerHeight - 150 && rect.height < 200) {
            element.style.display = 'none !important';
          }
        }
      });
    });
  } catch (error) {
    console.log(`⚠️ Could not remove cookie banners: ${error.message}`);
  }
}

// Enhanced screenshot with improved image loading
async function takeScreenshot(page, filename, outputDir, timeout = 60000) {
  const filepath = path.join(outputDir, filename);

  try {
    console.log(`📸 Preparing screenshot: ${filename}`);

    console.log(`   🔄 Loading all content and images...`);

    // First, wait for initial load and scroll through page to trigger lazy loading
    await scrollThroughPage(page);

    // Enhanced image loading with multiple strategies
    await loadAllImagesEnhanced(page);

    // Wait for any dynamic content that might load images
    await page.waitForTimeout(3000);

    // Final scroll to ensure everything is loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);

    // Remove cookie banners before taking screenshot
    await removeCookieBanners(page);

    // Small delay for banner removal to take effect
    await page.waitForTimeout(500);

    console.log(`✨ Taking screenshot...`);

    // PNG screenshots don't support quality option, only JPEG does
    const screenshotOptions = {
      path: filepath,
      fullPage: true,
      timeout
    };

    await page.screenshot(screenshotOptions);

    console.log(`✅ Screenshot saved: ${filepath}`);

  } catch (error) {
    console.log(`❌ Failed to take screenshot ${filename}: ${error.message}`);
    throw error;
  }
}

// Scroll through page to trigger lazy loading
async function scrollThroughPage(page) {
  try {
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentScroll = 0;

      while (currentScroll < scrollHeight) {
        window.scrollTo(0, currentScroll);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait between scrolls
        currentScroll += viewportHeight * 0.8; // Overlap slightly for better coverage
      }

      // Scroll back to top
      window.scrollTo(0, 0);
    });
  } catch (error) {
    console.log(`⚠️ Could not scroll through page: ${error.message}`);
  }
}

// Enhanced image loading with multiple strategies
async function loadAllImagesEnhanced(page) {
  try {
    await page.evaluate(async () => {
      // Strategy 1: Wait for all <img> tags
      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = resolve;
          img.onerror = resolve;
          // Extended timeout for slow connections
          setTimeout(resolve, 8000);
        });
      });

      // Strategy 2: Wait for images loaded via CSS background-image
      const bgElements = document.querySelectorAll('[style*="background-image"], [data-bg]');
      const bgPromises = Array.from(bgElements).map(el => {
        return new Promise((resolve) => {
          const style = window.getComputedStyle(el);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            // Create a temporary img element to check if background image loads
            const tempImg = new Image();
            const urlMatch = bgImage.match(/url\(["']?([^"']+)["']?\)/);
            if (urlMatch) {
              tempImg.src = urlMatch[1];
              tempImg.onload = resolve;
              tempImg.onerror = resolve;
              setTimeout(resolve, 5000);
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      });

      // Strategy 3: Wait for images in picture elements
      const pictureElements = document.querySelectorAll('picture');
      const picturePromises = Array.from(pictureElements).map(picture => {
        const sources = picture.querySelectorAll('source');
        return Promise.all(Array.from(sources).map(source => {
          return new Promise((resolve) => {
            const img = document.createElement('img');
            img.src = source.srcset.split(',')[0].split(' ')[0]; // Get first source
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 5000);
          });
        }));
      });

      // Strategy 4: Wait for images loaded via JavaScript (common in SPAs)
      const jsImageSelectors = [
        '[data-src]', '[data-lazy-src]', '[data-original]', '[data-srcset]',
        '.lazy', '.lazyload', '[loading="lazy"]', '[data-background-image]'
      ];

      const jsImagePromises = [];
      jsImageSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        Array.from(elements).forEach(el => {
          jsImagePromises.push(new Promise((resolve) => {
            setTimeout(resolve, 3000); // Give time for JS to potentially load
          }));
        });
      });

      // Wait for all image loading strategies
      const allPromises = [
        ...imagePromises,
        ...bgPromises,
        ...picturePromises.flat(),
        ...jsImagePromises
      ];

      return Promise.all(allPromises);
    });
  } catch (error) {
    console.log(`⚠️ Enhanced image loading failed: ${error.message}`);
  }
}

// Find key pages on the site
async function findKeyPages(page, maxPages = 3) {
  try {
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const mainLinks = anchors
        .map(a => ({ href: a.href, text: a.textContent.trim().toLowerCase() }))
        .filter(link => {
          // Filter for common page types
          const href = link.href.toLowerCase();
          return link.text === 'about' || link.text === 'contact' ||
                 href.includes('/about') || href.includes('/contact') ||
                 (href.includes('/product') && link.text.length > 0);
        })
        .map(link => link.href);

      return [...new Set(mainLinks)]; // Remove duplicates
    });

    // Handle unlimited pages (-1)
    const isUnlimited = maxPages === -1;
    const effectiveMaxPages = isUnlimited ? links.length : Math.min(maxPages, links.length);
    const limitedLinks = links.slice(0, effectiveMaxPages);

    console.log(`Found ${limitedLinks.length} key pages to capture ${isUnlimited ? '(unlimited)' : `(limited to ${maxPages})`}`);
    return limitedLinks;
  } catch (error) {
    console.error(`Failed to find key pages: ${error.message}`);
    return [];
  }
}

// Spider/Crawler implementation for comprehensive site capture
class WebSpider {
  constructor(baseUrl, maxPages = 20, outputDir, page, options = {}) {
    this.baseUrl = new URL(baseUrl).origin;
    // Handle unlimited pages (-1)
    this.maxPages = maxPages === -1 ? 1000 : maxPages;
    this.isUnlimited = maxPages === -1;
    this.outputDir = outputDir;
    this.page = page;
    this.visitedUrls = new Set();
    this.queue = [];
    this.pageCounter = 0;
    this.viewportName = options.viewportName || 'desktop';
  }

  isInternalLink(url) {
    try {
      return url.startsWith(this.baseUrl);
    } catch {
      return false;
    }
  }

  normalizeUrl(url) {
    try {
      const urlObj = new URL(url, this.baseUrl);
      // Remove fragments and query params for simplicity
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  async discoverLinks(currentUrl) {
    try {
      const links = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(link => link.href)
          .filter(href => href && href.trim() && !href.includes('#') && !href.startsWith('mailto:'));
      });

      const internalLinks = links
        .filter(href => this.isInternalLink(href))
        .map(href => this.normalizeUrl(href))
        .filter(normalized => normalized && !this.visitedUrls.has(normalized));

      return [...new Set(internalLinks)];
    } catch (error) {
      console.log(`    ⚠️ Error discovering links on ${currentUrl}: ${error.message}`);
      return [];
    }
  }

  generatePageName(url) {
    try {
      const urlObj = new URL(url);
      let name = urlObj.pathname.replace(/^\//, '').replace(/\//g, '-');
      if (!name || name === '') name = 'homepage';
      return name;
    } catch {
      return `page-${this.pageCounter}`;
    }
  }

  async capturePage(url) {
    if (this.visitedUrls.has(url) || this.pageCounter >= this.maxPages) {
      return false;
    }

    this.visitedUrls.add(url);

    try {
      console.log(`📸 Capturing: ${url}`);

      // Navigate to page with error recovery
      try {
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (navError) {
        console.log(`    ⚠️ Navigation timeout, trying with extended timeout...`);
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 50000 });
      }

      // Generate filename with viewport, timestamp and page number
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pageIndex = this.pageCounter + 1;
      const pageSuffix = `_${String(pageIndex).padStart(3, '0')}`;
      const viewportSuffix = this.viewportName ? `_${this.viewportName}` : '';
      const filename = `screenshot_${timestamp}${viewportSuffix}${pageSuffix}.png`;

      // Take screenshot
      await takeScreenshot(this.page, filename, this.outputDir);

      this.pageCounter++;

      // Discover new links from this page
      const newLinks = await this.discoverLinks(url);

      for (const link of newLinks) {
        if (!this.visitedUrls.has(link) && this.queue.length < this.maxPages) {
          this.queue.push(link);
        }
      }

      return true;
    } catch (error) {
      console.log(`    ❌ Failed to capture ${url}: ${error.message}`);
      this.visitedUrls.delete(url); // Remove from visited to allow retry
      return false;
    }
  }

  async crawl(startUrl) {
    console.log(`🕷️ Starting full site crawl from: ${startUrl}`);
    console.log(`📊 Target: Up to ${this.maxPages} pages`);

    this.queue.push(this.normalizeUrl(startUrl));

    while (this.queue.length > 0 && this.pageCounter < this.maxPages) {
      const currentUrl = this.queue.shift();

      if (currentUrl && !this.visitedUrls.has(currentUrl)) {
        await this.capturePage(currentUrl);
      }
    }

    console.log(`✅ Crawl completed! Captured ${this.pageCounter} pages.`);
    console.log(`📈 Visited ${this.visitedUrls.size} unique URLs.`);
  }
}

async function main() {
  const { url, outputDir: requestedOutputDir, pagesToCapture, crawlMode, headless, customOutputDir, viewport, viewportName } = parseArgs();

  // Determine final output directory
  const finalOutputDir = customOutputDir
    ? requestedOutputDir
    : generateTimestampedOutputDir('./screenshots');

  let browser;

  try {
    console.log('Starting screenshot automation...');
    console.log(`URL: ${url}`);
    console.log(`Output directory: ${finalOutputDir}`);
    console.log(`Pages to capture: ${pagesToCapture}`);
    console.log(`Mode: ${crawlMode ? '🕷️ Full crawler mode' : '🎯 Smart discovery mode'}`);
    console.log(`Browser: ${headless ? '👻 Headless' : '👁️ Visible'}`);
    console.log(`Viewport: ${viewportName} (${viewport.width}x${viewport.height})`);

    // Ensure output directory exists
    await ensureOutputDir(finalOutputDir);

    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ headless }); // Use configured headless mode
    const context = await browser.newContext();
    const page = await context.newPage();
  
    // Set viewport size
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });
  
    console.log(`🖥️  Using viewport: ${viewportName} (${viewport.width}x${viewport.height})`);

    if (crawlMode) {
      // FULL CRAWLER MODE - Capture ALL pages
      const spider = new WebSpider(url, pagesToCapture, finalOutputDir, page, { viewportName });
      await spider.crawl(url);
    } else {
      // SMART DISCOVERY MODE - Original behavior with enhanced error handling
      // Navigate to homepage with improved error handling
      console.log('Navigating to homepage...');
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (navigationError) {
        console.log(`⚠️ Navigation timeout, trying with simpler wait condition...`);
        try {
          // Try with simpler wait condition and longer timeout
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
          console.log('✓ Page loaded with extended timeout');
        } catch (secondError) {
          console.log(`❌ Navigation still failed: ${secondError.message}`);
          console.log('🔍 Checking if page is accessible...');
          throw secondError;
        }
      }

      // Take homepage screenshot
      await takeScreenshot(page, 'homepage.png', finalOutputDir);

      // Find and capture key pages
      let capturedPages = 1; // Homepage already captured
      let maxPagesTarget = pagesToCapture === -1 ? 100 : pagesToCapture; // Target limit for unlimited mode

      // For unlimited mode, search for maximum key pages to start with
      const keyPagesLimit = pagesToCapture === -1 ? 20 : Math.max(1, pagesToCapture - 1);
      const keyPages = await findKeyPages(page, keyPagesLimit);

      console.log(`🎯 Targeting ${maxPagesTarget} total pages. Need ${maxPagesTarget - capturedPages} more.`);

      // Capture key pages first
      for (const keyPageUrl of keyPages) {
        if (capturedPages >= maxPagesTarget) {
          console.log(`✋ Reached target limit (${maxPagesTarget}). Stopped capturing key pages.`);
          break;
        }

        try {
          console.log(`[${capturedPages}/${maxPagesTarget}] Navigating to: ${keyPageUrl}`);
          try {
            await page.goto(keyPageUrl, { waitUntil: 'networkidle', timeout: 30000 });
          } catch (navError) {
            console.log(`  ⚠️ Navigation timeout for ${keyPageUrl}, trying with extended timeout...`);
            await page.goto(keyPageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          }

          // Generate filename from URL or page title
          const pathname = new URL(keyPageUrl).pathname.replace(/^\//, '').replace(/\//g, '-');
          const filename = pathname ? `${pathname}.png` : `page-${capturedPages}.png`;

          await takeScreenshot(page, filename, finalOutputDir);
          capturedPages++;
          console.log(`✅ Progress: ${capturedPages}/${maxPagesTarget} pages captured`);
        } catch (error) {
          console.log(`  ❌ Failed to capture ${keyPageUrl}: ${error.message}`);
          // Continue with next page
          continue;
        }
      }

      // If we still need more pages, try to capture additional links
      const isUnlimited = pagesToCapture === -1;
      const pagesNeeded = isUnlimited ? 100 : Math.max(0, pagesToCapture - capturedPages);

      if (pagesNeeded > 0) {
        console.log(`🔍 Need ${pagesNeeded} more pages. Searching for additional links...`);
        console.log(`📊 Progress: ${capturedPages}/${isUnlimited ? '∞' : pagesToCapture} pages captured`);

        const allLinksEvaluated = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(href => href.startsWith(window.location.origin)) // Only internal links
            .filter((href, index, arr) => arr.indexOf(href) === index); // Remove duplicates
        });

        // Limit to avoid overwhelm while ensuring we get enough links
        const maxLinksToCheck = isUnlimited ? Math.min(100, allLinksEvaluated.length) : pagesNeeded + 10;
        const linksToProcess = allLinksEvaluated.slice(0, maxLinksToCheck);

        console.log(`📋 Found ${linksToProcess.length} potential pages to capture`);

        // Continue capturing until we reach our target
        let continueCapturing = true;
        let linkIndex = 0;
        let successfulCaptures = 0;

        while (continueCapturing && linkIndex < linksToProcess.length) {
          // Check if we've reached our target
          if (!isUnlimited && capturedPages >= pagesToCapture) {
            console.log(`✋ Target reached (${pagesToCapture} pages). Stopping additional captures.`);
            break;
          }

          // Safety check for unlimited mode
          if (isUnlimited && capturedPages >= 100) {
            console.log(`🛑 Safety limit: Stopped at 100 pages to prevent excessive traffic`);
            break;
          }

          const linkUrl = linksToProcess[linkIndex];

          try {
            console.log(`[${capturedPages}/${isUnlimited ? '∞' : pagesToCapture}] Capturing additional page: ${linkUrl}`);
            try {
              await page.goto(linkUrl, { waitUntil: 'networkidle', timeout: 30000 });
            } catch (navError) {
              console.log(`  ⚠️ Navigation timeout for ${linkUrl}, trying with extended timeout...`);
              await page.goto(linkUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            }

            const pathname = new URL(linkUrl).pathname.replace(/^\//, '').replace(/\//g, '-');
            const filename = pathname ? `${pathname}.png` : `page-${capturedPages}.png`;

            await takeScreenshot(page, filename, finalOutputDir);
            capturedPages++;
            successfulCaptures++;
            console.log(`✅ Progress: ${capturedPages}/${isUnlimited ? '∞' : pagesToCapture} pages captured`);

          } catch (error) {
            console.log(`  ❌ Failed to capture ${linkUrl}: ${error.message}`);
          }

          linkIndex++;

          // Prevent endless loop by checking we've actually captured something recent
          if (linkIndex > 50 && successfulCaptures === 0) {
            console.log(`🛑 Giving up after ${linkIndex} attempts with no successful captures`);
            break;
          }
        }

        if (successfulCaptures > 0) {
          console.log(`📈 Successfully captured ${successfulCaptures} additional pages`);
        } else {
          console.log(`💔 No additional pages could be captured from this session`);
        }
      } else {
        console.log(`✅ Target already reached! ${capturedPages} pages captured.`);
      }

      console.log(`✅ Completed! Captured ${capturedPages} pages in smart discovery mode.`);
    }

    console.log(`Screenshots saved to: ${path.resolve(finalOutputDir)}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the script
main();
