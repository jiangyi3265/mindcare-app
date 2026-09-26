import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { launchBrowser } from './browser.mjs';

const appUrl = process.env.MINDCARE_APP_URL || 'http://127.0.0.1:5173';
const browser = await launchBrowser();
try {
	for (const width of [390, 1280]) {
		const page = await browser.newPage({
			viewport: { width, height: 844 },
			isMobile: width < 500,
			hasTouch: width < 500,
		});
		const errors = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', message => {
			if (message.type() === 'error') errors.push(message.text());
		});
		page.on('requestfailed', request => errors.push(`${request.failure()?.errorText} ${request.url()}`));
		page.on('response', response => {
			if (response.status() >= 400 && /\/mindcare\/|\/assets\/|\/static\//.test(response.url())) {
				errors.push(`${response.status()} ${response.url()}`);
			}
		});
		await page.goto(`${appUrl}/#/pages/consultation/index`, { waitUntil: 'domcontentloaded' });
		await page.locator('.booking-card').waitFor();
		await page.waitForFunction(() => {
			const images = [...document.querySelectorAll('.artwork img')];
			return images.length >= 2 && images.every(image => image.complete && image.naturalWidth > 0);
		}, undefined, { timeout: 15000 });
		assert.equal(await page.getByText('微信官方客服').count(), 0);
		assert.equal(await page.getByText('将打开微信客服会话').count(), 0);
		assert.equal(await page.locator('.support-card').count(), 0);
		assert.equal(await page.locator('.booking-card').count(), 1);
		assert.equal(await page.getByText('查看详情 · 选择预约时段', { exact: true }).count(), await page.locator('.expert-card').count());
		await page.locator('.expert-card').first().click();
		await page.getByText('已开放未来两个月的预约', { exact: false }).waitFor();
		assert.equal(await page.locator('.availability-day').count(), 7);
		assert.equal(await page.locator('.slot-button').count(), 21);
		await page.locator('.slot-button').first().click();
		await page.getByText('提交预约', { exact: true }).waitFor();
		assert.equal(await page.locator('.date').count(), 62);
		assert.ok(await page.locator('.expert-option.selected').count());
		await page.goto(`${appUrl}/#/pages/consultation/index`, { waitUntil: 'domcontentloaded' });
		await page.locator('.booking-card').waitFor();
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
		await page.screenshot({ path: join(tmpdir(), `mindcare-consultation-${width}.png`), fullPage: true });
		await page.locator('.faq').first().click();
		await page.getByText('若不确定，可在预约时留言说明需求。', { exact: false }).waitFor();
		await page.locator('.booking-card').getByText('立即预约').click();
		await page.getByText('提交预约', { exact: true }).waitFor();
		assert.deepEqual(errors, []);
		console.log(`PASS ${width}px 咨询页无微信客服卡片、预约入口可用、无页面异常`);
		await page.close();
	}
} finally {
	await browser.close();
}
