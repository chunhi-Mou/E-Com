// Screenshot pass for the design review. Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
// Uses the Chromium already present under PLAYWRIGHT_BROWSERS_PATH (no `playwright install`).
import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "screenshots";
mkdirSync(OUT, { recursive: true });

function findChrome() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  for (const d of readdirSync(root).filter((x) => x.startsWith("chromium-"))) {
    const p = join(root, d, "chrome-linux", "chrome");
    if (existsSync(p)) return p;
  }
  return undefined;
}

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fake Web Speech API so the voice flow is demonstrable headless
const speechStub = `
  window.SpeechRecognition = window.webkitSpeechRecognition = class {
    start(){ setTimeout(()=>this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:'tôi muốn mua áo'}],{isFinal:false})]}),500);
             setTimeout(()=>this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:'tôi muốn mua áo mùa đông'}],{isFinal:true})]}),1100); }
    stop(){ setTimeout(()=>this.onend&&this.onend(),50); }
    abort(){ this.onend&&this.onend(); }
  };
  window.speechSynthesis && (window.speechSynthesis.speak = (u)=>{ setTimeout(()=>u.onend&&u.onend(),2500); });
`;

async function run(label, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, permissions: ["microphone"], locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  await ctx.addInitScript(speechStub);
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`[${label}] console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
  const shot = async (name, opts = {}) => {
    await sleep(opts.wait ?? 900);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: opts.full ?? false });
  };

  await page.goto(`${BASE}/`);
  await page.waitForSelector("article");
  await shot("01-home", { full: true });

  // Search: Inspect on
  await page.evaluate(() => localStorage.setItem("sam-ui-v1", JSON.stringify({ state: { inspect: true, speakReplies: true, voiceLang: "vi", recent: [] }, version: 0 })));
  await page.goto(`${BASE}/search?q=${encodeURIComponent("áo mùa đông dưới 500k")}`);
  await page.waitForSelector("article");
  await shot("02-search-inspect", { wait: 1500 });

  // Relaxed filter + chips
  await page.goto(`${BASE}/search?q=${encodeURIComponent("giày thể thao màu cam dưới 150k")}`);
  await page.waitForSelector("article, [role=status]");
  await shot("03-search-relaxed", { wait: 1200 });

  // Empty
  await page.goto(`${BASE}/search?q=${encodeURIComponent("xe máy")}`);
  await shot("04-search-empty", { wait: 1000 });

  // Search dropdown focus
  await page.goto(`${BASE}/`);
  await page.click("input[role=combobox]");
  await shot("05-search-focus", { wait: 600 });
  await page.keyboard.type("giay");
  await shot("06-search-suggest", { wait: 700 });

  // Voice recording
  await page.goto(`${BASE}/`);
  await page.click('button[aria-label="Tìm bằng giọng nói"]');
  await sleep(900);
  await shot("07-voice-listening", { wait: 100 });
  await page.click('button[aria-label^="Xong"]');
  await page.waitForURL(/m=voice/, { timeout: 8000 });
  await page.waitForSelector("article");
  await shot("08-voice-results", { wait: 1500 });

  // Image search
  await page.goto(`${BASE}/`);
  await page.locator('input[type=file]').first().setInputFiles(`${process.env.TEST_IMG ?? "/tmp/test-shoe.png"}`).catch(() => {});
  await page.waitForURL(/m=image/, { timeout: 8000 }).catch(() => {});
  await page.waitForSelector("article", { timeout: 8000 }).catch(() => {});
  await shot("09-image-search", { wait: 1500 });

  // Product detail
  await page.goto(`${BASE}/search?q=${encodeURIComponent("áo len nam")}`);
  await page.waitForSelector("article");
  await page.locator("article a").first().click();
  await page.waitForURL(/\/product\//);
  await shot("10-product", { wait: 1200, full: true });

  // Add to cart
  const add = page.locator('button[aria-label="Thêm vào giỏ"]:visible').first();
  await add.click();
  await sleep(500);
  await shot("11-product-added", { wait: 300 });

  await page.goto(`${BASE}/cart`);
  await shot("12-cart", { wait: 800, full: true });
  await page.goto(`${BASE}/checkout`);
  await shot("13-checkout", { wait: 600, full: true });
  await page.click('form:has(#f-fullName) button[type=submit]');
  await shot("14-checkout-errors", { wait: 500, full: true });
  await page.fill("#f-fullName", "Nguyễn Văn An");
  await page.fill("#f-phone", "0901234567");
  await page.selectOption("#f-province", "Hà Nội");
  await page.fill("#f-ward", "Phường Cầu Giấy");
  await page.fill("#f-street", "12 Trần Thái Tông");
  await page.click('form:has(#f-fullName) button[type=submit]');
  await page.waitForURL(/placed=1/, { timeout: 8000 });
  await shot("15-order-placed", { wait: 1400, full: true });

  await page.goto(`${BASE}/orders/20261001`);
  await shot("16-order-tracking", { wait: 800, full: true });
  await page.goto(`${BASE}/orders`);
  await shot("17-orders", { wait: 600 });

  await ctx.close();
}

await run("1440", { width: 1440, height: 900 }, false);
await run("390", { width: 390, height: 844 }, true);
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
