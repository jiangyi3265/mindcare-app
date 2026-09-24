import assert from "node:assert/strict";
import { launchBrowser } from "./browser.mjs";

const url = process.env.MINDCARE_APP_URL || "https://xinlikls.oksja.cn";
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const pageErrors = [];
const httpErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
page.on("response", response => {
  if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
});

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator(".app-shell").waitFor({ timeout: 30000 });
  console.log(`initial ${page.url()}`);
  console.log(`uni APIs ${JSON.stringify(await page.evaluate(() => ({
    navigateTo: typeof uni.navigateTo,
    reLaunch: typeof uni.reLaunch,
    redirectTo: typeof uni.redirectTo,
    navigateBack: typeof uni.navigateBack,
  })))}`);
  for (const [name, path] of [
    ["咨询", "/pages/consultation/index"],
    ["课堂", "/pages/courses/index"],
    ["活动", "/pages/activities/index"],
    ["我的", "/pages/profile/index"],
    ["测评", "/#/"],
  ]) {
    const tab = page.locator(".tab-bar .tab-item").filter({ hasText: name });
    console.log(`before ${name}: count=${await tab.count()} visible=${await tab.isVisible()}`);
    await tab.click({ timeout: 10000 });
    await page.waitForTimeout(700);
    console.log(`after ${name}: ${page.url()} title=${await page.locator(".header-title").first().textContent()}`);
    assert.ok(page.url().includes(path), `${name} should navigate to ${path}`);
    assert.equal(await tab.getAttribute("aria-current"), "page");
  }
  await page.locator(".assessment-card").first().click();
  assert.ok(page.url().includes("/pages/assessment/detail"));
  await page.locator('.app-header .icon-button[aria-label="返回"]').click();
  assert.ok(page.url().endsWith("/#/"));

  await page.locator(".tab-bar .tab-item").filter({ hasText: "咨询" }).click();
  await page.locator("uni-button").filter({ hasText: "立即预约" }).click();
  assert.ok(page.url().includes("/pages/consultation/booking"));
  await page.locator('.app-header .icon-button[aria-label="返回"]').click();

  await page.locator(".tab-bar .tab-item").filter({ hasText: "课堂" }).click();
  await page.locator(".course-row").first().click();
  assert.ok(page.url().includes("/pages/courses/detail"));
  await page.locator('.app-header .icon-button[aria-label="返回"]').click();

  await page.locator(".tab-bar .tab-item").filter({ hasText: "活动" }).click();
  await page.locator(".event-card").first().click();
  assert.ok(page.url().includes("/pages/activities/detail"));
  await page.locator('.app-header .icon-button[aria-label="返回"]').click();

  await page.locator(".tab-bar .tab-item").filter({ hasText: "我的" }).click();
  await page.locator(".health-card").click();
  assert.ok(page.url().includes("/pages/profile/records"));
  await page.locator('.app-header .icon-button[aria-label="返回"]').click();
  console.log("detail navigation and return: PASS");
  assert.deepEqual(pageErrors, []);
  if (new URL(url).hostname !== "127.0.0.1") assert.deepEqual(httpErrors, []);
} finally {
  console.log(`pageErrors=${JSON.stringify(pageErrors)} httpErrors=${JSON.stringify(httpErrors)}`);
  await browser.close();
}
