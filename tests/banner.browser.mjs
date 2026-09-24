import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { launchBrowser } from './browser.mjs';

if (process.env.MINDCARE_ISOLATED_TEST_DB !== '1' || !process.env.MINDCARE_TEST_ADMIN_PASSWORD) {
	throw new Error('Banner browser test requires an isolated test database and test admin password');
}
const appUrl = process.env.MINDCARE_APP_URL || 'http://127.0.0.1:5173';
const adminUrl = 'http://127.0.0.1:5180';
const apiUrl = 'http://127.0.0.1:18080';
if (new URL(appUrl).hostname !== '127.0.0.1') throw new Error('Browser test only runs against localhost');
const key = `banner-test-${Date.now().toString(36)}`;
const title = `轮播联调 ${Date.now()}`;
const browser = await launchBrowser();
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const appContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const admin = await adminContext.newPage();
const app = await appContext.newPage();
const errors = [];
for (const page of [admin, app]) {
	page.on('pageerror', error => errors.push(error.message));
	page.on('response', response => {
		if (response.status() >= 500 || (response.status() >= 400 && response.url().includes('/profile/upload/'))) errors.push(`${response.status()} ${response.url()}`);
	});
}
let token;
let createdId;
const api = async (path, options = {}) => {
	const response = await fetch(`${apiUrl}${path}`, {
		...options,
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
	});
	return response.json();
};
async function refreshApp() {
	const synced = app.waitForResponse(response => response.url().includes('/app/mindcare/bootstrap') && response.status() === 200);
	await app.reload({ waitUntil: 'domcontentloaded' });
	await synced;
	try { await app.locator('uni-swiper-item').first().waitFor({ timeout: 12000 }); }
	catch (error) {
		console.error('APP DIAGNOSTIC', app.url(), (await app.locator('body').innerText()).slice(0, 800), (await app.locator('body').innerHTML()).slice(0, 1000), errors);
		throw error;
	}
}

try {
	await app.goto(`${appUrl}/#/pages/index/index`);
	await refreshApp();
	assert.equal(await app.locator('uni-swiper-item').count(), 2, 'seeded carousel has two slides');
	console.log('PASS 初始两张轮播图');

	await admin.goto(`${adminUrl}/login`);
	await admin.getByPlaceholder('账号').fill('admin');
	await admin.getByPlaceholder('密码').fill(process.env.MINDCARE_TEST_ADMIN_PASSWORD);
	await admin.getByRole('button', { name: /登 录/ }).click();
	await admin.waitForFunction(() => document.cookie.includes('Admin-Token='), undefined, { timeout: 30000 });
	token = (await adminContext.cookies(adminUrl)).find(cookie => cookie.name === 'Admin-Token')?.value;
	assert.ok(token);
	await admin.goto(`${adminUrl}/mindcare/banners`);
	await admin.getByRole('heading', { name: '首页轮播图' }).waitFor();
	await admin.locator('.el-table__row').first().getByText('已发布').waitFor();
	await admin.screenshot({ path: join(tmpdir(), 'mindcare-banner-admin.png'), fullPage: true });
	await admin.getByRole('button', { name: '新增轮播图' }).click();
	const dialog = admin.getByRole('dialog');
	await dialog.locator('.el-form-item').filter({ hasText: '标题' }).locator('input').fill(title);
	await dialog.locator('.el-form-item').filter({ hasText: '内容标识' }).locator('input').fill(key);
	await dialog.locator('input[type=file]').setInputFiles(resolve('../../RuoYi-Vue3/src/assets/images/profile.jpg'));
	await admin.getByText('图片已上传，请保存轮播图').waitFor();
	await dialog.locator('.el-form-item').filter({ hasText: '排序' }).locator('input').fill('0');
	await dialog.getByRole('button', { name: '保存' }).click();
	await dialog.waitFor({ state: 'hidden' });
	const list = await api('/mindcare/content/list?contentType=banner&pageNum=1&pageSize=20');
	const row = list.rows.find(item => item.contentKey === key);
	assert.ok(row, 'admin-created banner is persisted');
	createdId = row.contentId;
	assert.match(JSON.parse(row.payloadJson).image, /^\/profile\/upload\//);
	console.log('PASS 后台上传、发布、排序');

	await refreshApp();
	assert.equal(await app.locator('uni-swiper-item').count(), 3);
	assert.equal(await app.locator('uni-swiper-item').first().locator('uni-image').count(), 1, 'sort order zero is first');
	const firstImage = await app.locator('uni-swiper-item').first().locator('img').first().getAttribute('src');
	assert.ok(firstImage?.includes('/api/profile/upload/'));
	const firstFrame = await app.locator('uni-swiper').screenshot({ path: join(tmpdir(), 'mindcare-banner-mobile.png') });
	await app.waitForTimeout(5200);
	const nextFrame = await app.locator('uni-swiper').screenshot();
	assert.equal(firstFrame.equals(nextFrame), false, 'carousel advances automatically');
	console.log('PASS 用户端展示上传图片、排序与自动轮播');

	await admin.locator('.el-table__row').filter({ hasText: title }).getByRole('button', { name: '编辑' }).click();
	await dialog.locator('.el-switch').click();
	await dialog.getByRole('button', { name: '保存' }).click();
	await dialog.waitFor({ state: 'hidden' });
	await refreshApp();
	assert.equal(await app.locator('uni-swiper-item').count(), 2, 'unpublished banner is removed');
	console.log('PASS 后台下架同步到用户端');

	assert.deepEqual(errors, []);
	console.log('PASS 无页面异常和 5xx 请求');
} finally {
	if (createdId && token) await api(`/mindcare/content/${createdId}`, { method: 'DELETE' });
	await browser.close();
}
