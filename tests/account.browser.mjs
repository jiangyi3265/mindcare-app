import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";

if (process.env.MINDCARE_ISOLATED_TEST_DB !== "1") {
  throw new Error("Browser account test requires MINDCARE_ISOLATED_TEST_DB=1");
}
const appUrl = process.env.MINDCARE_APP_URL || "http://127.0.0.1:5173";
const adminUrl = process.env.MINDCARE_ADMIN_URL || "http://127.0.0.1:5180";
const adminPassword = process.env.MINDCARE_TEST_ADMIN_PASSWORD;
if (!adminPassword) throw new Error("Set MINDCARE_TEST_ADMIN_PASSWORD for the isolated admin test account");
if ([appUrl, adminUrl].some(url => new URL(url).hostname !== "127.0.0.1")) {
  throw new Error("Browser account test must never target public sites");
}
const screenshots = path.join(os.tmpdir(), "mindcare-account-browser");
fs.mkdirSync(screenshots, { recursive: true });
const phone = `139${randomBytes(4).readUInt32BE(0).toString().padStart(8, "0").slice(0, 8)}`;
const password = `Mindcare${randomBytes(6).toString("hex")}`;
const newPassword = `Updated${randomBytes(6).toString("hex")}`;
const browser = await launchBrowser();
const errors = [];
const newUser = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${appUrl}/#/pages/profile/index`, { waitUntil: "domcontentloaded" });
  await page.locator(".auth-prompt").waitFor({ timeout: 30000 });
  return { context, page };
};
const input = (page, label) => page.locator(`uni-input[aria-label="${label}"] input`);
const button = (page, label) => page.locator("uni-button").filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).last();

try {
  const first = await newUser();
  await button(first.page, "登录或注册").click();
  await first.page.locator(".auth-switch uni-button").filter({ hasText: "注册" }).click();
  await input(first.page, "手机号").fill(phone);
  await input(first.page, "昵称").fill("联调心友");
  await input(first.page, "密码").fill(password);
  await input(first.page, "确认密码").fill(password);
  await button(first.page, "注册账号").click();
  await first.page.locator(".recovery-value").waitFor({ timeout: 30000 });
  const recoveryCode = (await first.page.locator(".recovery-value").innerText()).trim();
  assert.match(recoveryCode, /^[A-F0-9-]{39}$/);
  await first.page.screenshot({ path: path.join(screenshots, "registration.png"), fullPage: true });
  await button(first.page, "我已妥善保存恢复码").click();
  await button(first.page, "进入我的账号").click();
  await first.page.locator(".profile-copy").getByText("联调心友").waitFor();
  assert.equal(await first.page.locator(".auth-prompt").count(), 0);
  console.log("PASS browser registration and profile");

  await first.page.locator(".tab-bar .tab-item").filter({ hasText: "测评" }).click();
  await first.page.locator(".search-box input").fill("压力");
  await first.page.locator(".assessment-card").filter({ hasText: "压力水平自评" }).click();
  await button(first.page, "开始测评").click();
  for (let index = 0; index < 10; index++) {
    await button(first.page, "偶尔").click();
    if (index === 9) {
      const saved = first.page.waitForResponse(response => response.url().includes("/app/mindcare/records") && response.request().method() === "POST", { timeout: 30000 });
      await button(first.page, "提交测评").click();
      assert.equal((await (await saved).json()).code, 200);
    } else {
      await button(first.page, "下一题").click();
    }
  }
  await first.page.locator(".score").waitFor();
  console.log("PASS assessment saved under registered account");

  const second = await newUser();
  await button(second.page, "登录或注册").click();
  await input(second.page, "手机号").fill(phone);
  await input(second.page, "密码").fill(password);
  await button(second.page, "登录账号").click();
  await second.page.locator(".profile-copy").getByText("联调心友").waitFor({ timeout: 30000 });
  assert.equal((await second.page.locator(".stats .stat-number").first().innerText()).trim(), "1");
  await second.page.screenshot({ path: path.join(screenshots, "profile.png"), fullPage: true });
  console.log("PASS browser login on second device");

  const third = await newUser();
  await button(third.page, "登录或注册").click();
  await button(third.page, "忘记密码？使用恢复码找回").click();
  await input(third.page, "手机号").fill(phone);
  await input(third.page, "恢复码").fill(recoveryCode);
  await input(third.page, "新密码").fill(newPassword);
  await input(third.page, "确认密码").fill(newPassword);
  await button(third.page, "找回密码").click();
  await third.page.locator(".recovery-value").waitFor({ timeout: 30000 });
  assert.notEqual((await third.page.locator(".recovery-value").innerText()).trim(), recoveryCode);
  await button(third.page, "我已妥善保存恢复码").click();
  await button(third.page, "进入我的账号").click();
  await third.page.locator(".profile-copy").getByText("联调心友").waitFor();
  await second.page.reload({ waitUntil: "domcontentloaded" });
  await second.page.locator(".auth-prompt").waitFor({ timeout: 30000 });
  console.log("PASS browser recovery and prior-device sign-out");

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminContext.newPage();
  admin.on("pageerror", error => errors.push(`admin: ${error.message}`));
  await admin.goto(`${adminUrl}/login`, { waitUntil: "domcontentloaded" });
  await admin.getByPlaceholder("账号").fill("admin");
  await admin.getByPlaceholder("密码").fill(adminPassword);
  await admin.getByRole("button", { name: /登 录/ }).click();
  try {
    await admin.waitForFunction(() => document.cookie.includes("Admin-Token="), undefined, { timeout: 30000 });
  } catch (error) {
    await admin.screenshot({ path: path.join(screenshots, "admin-login-error.png"), fullPage: true });
    console.log(`adminLoginErrors=${JSON.stringify(await admin.locator(".el-form-item__error, .el-message").allTextContents())}`);
    throw error;
  }
  const adminToken = (await adminContext.cookies(adminUrl)).find(cookie => cookie.name === "Admin-Token")?.value;
  assert.ok(adminToken);
  const accountResponse = await admin.request.get(`${adminUrl}/dev-api/mindcare/account/list?pageNum=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const accountBody = await accountResponse.json();
  assert.equal(accountBody.code, 200);
  assert.ok(accountBody.rows.some(row => row.phone === phone));
  assert.ok(accountBody.rows.every(row => !("passwordHash" in row) && !("recoveryHash" in row)));
  await admin.goto(`${adminUrl}/mindcare/clients`, { waitUntil: "domcontentloaded" });
  await admin.getByText("用户账户与终端", { exact: true }).waitFor({ timeout: 30000 });
  await admin.locator(".el-tab-pane:visible .el-table__row").filter({ hasText: phone }).first().waitFor();
  await admin.screenshot({ path: path.join(screenshots, "admin-accounts.png"), fullPage: true });
  await admin.getByRole("tab", { name: "同步终端" }).click();
  await admin.locator(".el-tab-pane:visible .el-table__row").filter({ hasText: phone }).first().waitFor();
  console.log("PASS admin account and terminal views");

  assert.deepEqual(errors, []);
} finally {
  console.log(`browserErrors=${JSON.stringify(errors)}`);
  await browser.close();
}
