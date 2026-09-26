import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { launchBrowser } from './browser.mjs';

const base = process.env.MINDCARE_APP_URL || 'http://127.0.0.1:5173';
const browser = await launchBrowser();
try {
	for (const width of [390, 1280]) {
		const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
		const errors = [];
		page.on('pageerror', error => errors.push(error.message));
		page.on('console', message => { if (message.type() === 'error' && !message.location().url.includes('/api/')) errors.push(`${message.text()} ${message.location().url}`); });
		await page.goto(`${base}/#/pages/index/index`, { waitUntil: 'domcontentloaded' });
		await page.locator('.assessment-card').first().waitFor();
		await page.getByText(/测评量表（\d+）/).waitFor();
		assert.equal(await page.locator('.assessment-card').count(), 10);
		assert.equal(await page.locator('.assessment-card').filter({ hasText: 'K10心理困扰筛查' }).count(), 1);
		await page.screenshot({ path: join(tmpdir(), `mindcare-scales-home-${width}.png`), fullPage: true });
		await page.locator('.assessment-card').filter({ hasText: 'K6心理困扰筛查' }).click();
		await page.getByText('请根据过去30天的实际感受作答').waitFor();
		await page.getByText('查看量表原始来源').waitFor();
		await page.getByText('开始测评', { exact: true }).click();
		for (let question = 0; question < 6; question++) {
			await page.locator('.answer').last().click();
			await page.getByText(question === 5 ? '提交测评' : '下一题', { exact: true }).click();
		}
		await page.getByText('K6总分').waitFor();
		assert.equal((await page.locator('.score').textContent()).trim(), '24');
		await page.getByText('总分0–24', { exact: false }).waitFor();
		assert.equal(await page.getByText('你的状态较为平稳', { exact: false }).count(), 0);
		assert.equal(await page.locator('.metrics').count(), 0);
		await page.goto(`${base}/#/pages/index/index`, { waitUntil: 'domcontentloaded' });
		await page.locator('.assessment-card').filter({ hasText: 'Rosenberg自尊量表' }).click();
		await page.getByText('请根据自身实际情况作答').waitFor();
		await page.getByText('开始测评', { exact: true }).click();
		for (let question = 0; question < 10; question++) {
			await page.locator('.answer').nth([2, 4, 7, 8, 9].includes(question) ? 0 : 3).click();
			await page.getByText(question === 9 ? '提交测评' : '下一题', { exact: true }).click();
		}
		await page.getByText('RSES总分').waitFor();
		assert.equal((await page.locator('.score').textContent()).trim(), '30');
		await page.getByText('反向题已按原量表规则换算', { exact: false }).waitFor();
		await page.screenshot({ path: join(tmpdir(), `mindcare-scales-report-${width}.png`), fullPage: true });
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
		assert.deepEqual(errors, []);
		console.log(`PASS ${width}px：新增量表可发现，K6与RSES答题/计分/报告正常`);
		await page.close();
	}
} finally {
	await browser.close();
}
