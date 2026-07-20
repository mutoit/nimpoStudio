/**
 * QA headless: biblioteca en producción.
 * Reproducción miniatura, modal, stems mute, precios por plazo.
 * Uso: node scripts/qa-library.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "https://www.nimpo3dstudio.com";
const URL = `${BASE}/es/biblioteca/`;

const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "OK" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const audioErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") audioErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/previews/music/") && res.status() >= 400) {
      audioErrors.push(`HTTP ${res.status()} ${u}`);
    }
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  ok("page loads", (await page.title()).toLowerCase().includes("biblioteca"), await page.title());

  // —— Thumb play (Deep in the forest = first playable with stems) ——
  const playFab = page.locator("[data-thumb-play]").first();
  await playFab.waitFor({ state: "visible", timeout: 10000 });
  const itemId = await playFab.getAttribute("data-thumb-play");
  await playFab.click();
  await page.waitForTimeout(1500);

  const pressed = await playFab.getAttribute("aria-pressed");
  const playing = await page.evaluate(() => {
    // Access via checking button state only in page - audios are not in DOM
    return document.querySelector("[data-thumb-play][aria-pressed='true']") != null;
  });
  ok("thumb play starts (aria-pressed)", pressed === "true" || playing, `id=${itemId} pressed=${pressed}`);

  // Progress bar on thumb
  const prog = page.locator(`[data-thumb-progress="${itemId}"]`);
  const progVisible = await prog.isVisible().catch(() => false);
  ok("thumb progress bar visible while playing", progVisible);

  // Stop
  await playFab.click();
  await page.waitForTimeout(400);
  const pressedOff = await playFab.getAttribute("aria-pressed");
  ok("thumb stop", pressedOff === "false" || pressedOff === null, `pressed=${pressedOff}`);

  // —— Open modal (play FAB covers center of thumb → use Licenciar or force) ——
  const licBtn = page.locator(`[data-open-lic="${itemId}"]`);
  if (await licBtn.count()) {
    await licBtn.first().click();
  } else {
    await page.locator(`[data-open="${itemId}"]`).first().click({ force: true, position: { x: 8, y: 8 } });
  }
  await page.waitForTimeout(500);
  const modal = page.locator("[data-lb-overlay]");
  ok("modal opens", !(await modal.getAttribute("hidden")));

  // Stems mixer present for deep forest
  const mixRows = page.locator("[data-stem-src]");
  const stemCount = await mixRows.count();
  ok("stem checkboxes present", stemCount >= 3, `count=${stemCount}`);

  // Modal play
  const modalPlay = page.locator("[data-lb-preview-play]");
  await modalPlay.click();
  await page.waitForTimeout(2000);
  const modalLabel = (await modalPlay.textContent())?.trim();
  ok("modal play engaged", modalLabel === "❚❚" || modalLabel?.includes("❚"), `label=${modalLabel}`);

  // Time progresses
  const time1 = await page.locator("[data-lb-time]").textContent();
  await page.waitForTimeout(2000);
  const time2 = await page.locator("[data-lb-time]").textContent();
  ok("progress time advances", time1 !== time2, `${time1} -> ${time2}`);

  const sec = (t) => {
    const m = t?.match(/(\d+):(\d+)/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  };

  // Uncheck one stem — should NOT reset time to 0:00
  if (stemCount > 0) {
    const beforeUncheck = await page.locator("[data-lb-time]").textContent();
    await mixRows.nth(0).click(); // uncheck first
    await page.waitForTimeout(800);
    const afterUncheck = await page.locator("[data-lb-time]").textContent();
    const s1 = sec(beforeUncheck);
    const s2 = sec(afterUncheck);
    ok(
      "uncheck stem does not hard-reset to 0",
      s2 >= Math.max(0, s1 - 2),
      `${beforeUncheck} -> ${afterUncheck}`,
    );
    // re-check
    await mixRows.nth(0).click();
    await page.waitForTimeout(400);
  }

  // —— Seek bar: saltar ~50% (input + change = commit real) ——
  await page.waitForTimeout(1500);
  const seek = page.locator("[data-lb-seek]");
  await seek.waitFor({ state: "visible" });
  await seek.evaluate((el) => {
    el.value = "500";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(1800);
  const afterSeek = await page.locator("[data-lb-time]").textContent();
  const seekSec = sec(afterSeek);
  // pista ~48s → mitad ~24s; aceptar 15–40s y que no se quede en 0
  ok("seek bar jumps position", seekSec >= 15 && seekSec <= 40, `time=${afterSeek}`);
  // Confirmar que sigue avanzando tras el seek (no se pegó)
  await page.waitForTimeout(1500);
  const afterSeek2 = await page.locator("[data-lb-time]").textContent();
  ok(
    "seek keeps playing forward",
    sec(afterSeek2) >= seekSec,
    `${afterSeek} -> ${afterSeek2}`,
  );

  // —— Live price by term ——
  const usage = page.locator('[name="usage"]');
  await usage.selectOption("brand_video");
  await page.waitForTimeout(200);

  const term = page.locator('[name="term"]');
  const live = page.locator("[data-lb-live-total]");

  // Al abrir con stems, el form marca stems (+59). Probar base sin stems y con stems.
  const stemsCb = page.locator('[name="stems"]');
  await stemsCb.uncheck();
  await page.waitForTimeout(150);

  const prices = {};
  for (const t of ["single", "1y", "project", "2y"]) {
    await term.selectOption(t);
    await page.waitForTimeout(150);
    prices[t] = (await live.textContent())?.trim();
  }
  ok("price single 99", prices.single?.includes("99"), prices.single);
  ok("price 1y 139", prices["1y"]?.includes("139"), prices["1y"]);
  ok("price project 159", prices.project?.includes("159"), prices.project);
  ok("price 2y 179", prices["2y"]?.includes("179"), prices["2y"]);
  ok(
    "prices differ by term",
    new Set(Object.values(prices)).size >= 4,
    JSON.stringify(prices),
  );

  await stemsCb.check();
  await page.waitForTimeout(150);
  const withStems = (await live.textContent())?.trim();
  ok("2y + stems = 238", withStems?.includes("238"), withStems);

  // Close modal
  await page.locator("[data-lb-close]").click();
  await page.waitForTimeout(300);
  ok("modal closes", (await modal.getAttribute("hidden")) !== null);

  // Network errors on real audio (ignore known provisional)
  const hardAudioErr = audioErrors.filter(
    (e) => e.includes("DP ") || e.includes("dp.mp4") || e.includes("stem play fail"),
  );
  ok("no hard errors on Deep stems", hardAudioErr.length === 0, hardAudioErr.join("; "));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log("\n—— SUMMARY ——");
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.log("  FAIL:", f.name, f.detail));
    process.exit(1);
  }
  console.log("ALL_UI_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
