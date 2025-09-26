# Screenshot Bot - Website Screenshot Automation Tool

A Node.js script that leverages Playwright to automate full-page website screenshots. Ideal for UI/UX analysis, frontend regression tracking, and design documentation.

## 🚀 Features

- **Automatic navigation**: Captures the homepage and discovers key pages (About, Contact, Products)
- **Smart capture**: Produces full-page screenshots with heuristic detection of important links
- **Flexible configuration**: Command-line options let you tailor each run
- **Resilient error handling**: Continues even when individual pages fail
- **Wide compatibility**: Works across modern websites and frameworks

## 📋 Prerequisites

- Node.js (version 14 or newer)
- npm or yarn

## 🛠️ Installation

### Install project dependencies

```bash
# Initialize the npm project and install Playwright
npm init -y && npm install playwright

# Install the Playwright browsers
npx playwright install chromium
```

### Files created
- `package.json` – Node.js project configuration
- `screenshot-bot.js` – Main script
- `node_modules/` – Installed dependencies

## 📖 Usage

### Basic commands

```bash
# Default smart discovery mode (up to 5 pages)
node screenshot-bot.js https://mysite.com
# → Creates: ./screenshots/capture_2025-09-04_09-03-50/

# Full crawler mode — explores ALL pages it finds
node screenshot-bot.js https://mysite.com --crawl --pages 20
# → Captures up to 20 discovered pages

# Custom output directory (skips automatic timestamps)
node screenshot-bot.js https://mysite.com --output ./my-shots

# Debug mode with a visible browser window
node screenshot-bot.js https://mysite.com --debug --pages 3
# → Browser stays visible for troubleshooting

# Limit the number of captured pages (still uses timestamped folders)
node screenshot-bot.js https://mysite.com --pages 3

# Combine options with a custom directory
node screenshot-bot.js https://mysite.com --output ./captures --pages 10
```

### Available arguments

| Argument | Description | Required | Default | Notes |
|----------|-------------|----------|---------|-------|
| `<url>` | Website URL to analyze | Yes | - | - |
| `--crawl` | Full crawler mode: explores every internal page | No | false | Enables the web crawler |
| `--output <directory>` | Directory where screenshots are saved | No | `./screenshots` | Disables timestamps when provided |
| `--pages <number>` | How many pages to capture | No | `5` | Use `-1` for unlimited |
| `--debug` | Debug mode: visible browser window | No | false | Overrides `--headless` |
| `--headless` | Headless mode: hidden browser | No | true | Recommended in production |
| `--viewport <preset>` | Viewport preset to apply | No | `desktop` | See script for available presets |

### Automatic directory behavior

The script creates timestamped folders on every run:

```text
./screenshots/
├── capture_2025-09-04_09-03-50/  ← Run #1
│   ├── homepage.png
│   ├── about.png
│   └── contact.png
└── capture_2025-09-04_12-15-30/  ← Run #2
    ├── homepage.png
    ├── services.png
    └── products.png
```

**Benefits:**
- ✅ Each run is isolated in its own folder
- ✅ Automatic history retention
- ✅ Timestamp makes captures easy to distinguish
- ✅ No risk of accidental overwrite

**Timestamp format:** `capture_YYYY-MM-DD_HH-MM-SS`

### Operating modes

#### 🎯 Smart Discovery Mode (default)
- Captures the homepage, then hunts for important pages (About, Contact, Products)
- Analyzes on-page links to find the most relevant destinations
- Ideal for quick, targeted analysis
- Efficient for most workflows

#### 🕷️ Full Crawler Mode (`--crawl`)
- Recursively explores every internal link it encounters
- Behaves like a lightweight spider/robot
- Ideal for comprehensive coverage
- Can generate significant traffic and requires more time

**Example usage:**

```bash
# Smart discovery — fast and focused (recommended) — up to 5 pages
node screenshot-bot.js https://mysite.com --pages 8

# Full crawler — thorough but longer — up to 20 pages
node screenshot-bot.js https://mysite.com --crawl --pages 20

# Small sites — still efficient
node screenshot-bot.js https://landing-page.com --pages 3
```

#### 💡 When to use each mode

- **Smart Discovery**: UX reviews, documentation, visual regression spot checks
- **Full Crawler**: Full-site indexing, security audits, AI dataset generation

### Practical examples

```bash
# Portfolio analysis (Discovery mode)
node screenshot-bot.js https://john-doe.dev --pages 8

# E-commerce capture (Crawler mode for every page)
node screenshot-bot.js https://shop.example --crawl --pages 25

# Debugging session (visible browser)
node screenshot-bot.js https://my-site.com --debug --pages 3

# AI data generation (custom crawler output)
node screenshot-bot.js https://blog.example --crawl --pages 15 --output ./ai-data
```

## 📁 Generated file structure

```
my-captures/
├── homepage.png          # Homepage
├── about.png             # About page
├── contact.png           # Contact page
├── products.png          # Products page (if discovered)
└── page-4.png            # Additional pages
```

## ⚙️ How it works

1. **Initialization**:
   - Launches a Chromium browser (visible when debugging)
   - Creates the output directory when needed

2. **Intelligent navigation**:
   - Visits the homepage with enhanced error handling
   - On timeout: retries with a simpler wait condition and extended timeout
   - Handles slow or atypically loading sites

3. **Automatic discovery**:
   - Parses links on the current page
   - Targets key pages (About, Contact, Products)
   - Restricts itself to internal links only

4. **Robust capture**:
   - Navigates to each discovered page with the same error handling
   - Waits for `networkidle` before shooting
   - Captures full-page screenshots
   - Generates descriptive filenames

5. **Wrap-up**:
   - Closes the browser cleanly
   - Prints a summary of the run

## 🎯 Recommended use cases

### For developers
- Visual testing during CSS refactors
- Before/after design comparisons
- Documenting UI states

### For UX designers
- Rapid competitor analysis
- Systematic capture for UX audits
- Cataloging best practices

### For AI workflows
- Feed captures into tools such as Super Grok for analysis
- Generate datasets for machine-learning pipelines
- Automate visual quality reports

## 🔧 Configuration and tuning

### Headless mode
For production, adjust the following snippet in `screenshot-bot.js`:
```javascript
// Current debugging setup
browser = await chromium.launch({ headless: false });

// Production-ready configuration
browser = await chromium.launch({ headless: true });
```

### Custom viewport
Change the resolution directly in the script:
```javascript
await page.setViewportSize({ width: 1280, height: 1024 });
```

### Custom timeouts
```javascript
// Navigation timeout (currently 30 seconds)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// Screenshot timeout (currently 30 seconds)
await page.screenshot({ path: filepath, fullPage: true, timeout: 30000 });
```

## 🚨 Error handling

### Common issues

1. **Browser not found**:
   ```
   Error: chromium is not supported
   ```
   **Fix**: `npx playwright install chromium`

2. **Navigation timeout**:
   ```
   Error: Navigation timeout of 30000ms exceeded
   ```
   **Fix**: Increase the timeout or verify connectivity

3. **Write permissions**:
   ```
   Error: EACCES: permission denied
   ```
   **Fix**: Adjust folder permissions or provide an accessible path with `--output`

### Behavior on errors
- **Automatic recovery**: Retries with alternate strategies (longer timeout, relaxed wait conditions)
- Keeps processing remaining pages when one fails
- Surfaces clear console messages with suggestions
- Always closes the browser gracefully

### Intelligent timeout management
The script adapts when pages are slow to load:
1. **Initial attempt**: `networkidle` wait with a 30-second timeout
2. **Recovery**: `domcontentloaded` wait with an extended 45–60 second timeout
3. **Failure**: Aborts with a clear error message

## 📊 Console output

Sample successful run:
```
Starting screenshot automation...
URL: https://example.com
Output directory: screenshots/capture_2025-09-04_09-03-50
Pages to capture: 5
Launching browser...
Navigating to homepage...
Taking screenshot: homepage.png
✓ Screenshot saved: screenshots/capture_2025-09-04_09-03-50/homepage.png
Found 3 key pages to capture (limited to 4)
Navigating to: https://example.com/about
Taking screenshot: about.png
✓ Screenshot saved: screenshots/capture_2025-09-04_09-03-50/about.png
✅ Completed! Captured 2 pages.
Screenshots saved to: /Users/boubou/project/screenshots/capture_2025-09-04_09-03-50
Closing browser...
```

## 🔄 AI integration

Easily plug the script into AI tooling:

```bash
# Automatically forward captures to an AI workflow
node screenshot-bot.js https://mysite.com --output ./captures &&
./send-to-ai ./captures/*.png
```

## 📝 Important notes

- Respects `robots.txt` by default
- Adds delays between captures to avoid excessive traffic
- Produces full-resolution screenshots
- Compatible with modern sites (React, Vue, Angular, ...)

---

**Built with ❤️ to automate web analysis**
