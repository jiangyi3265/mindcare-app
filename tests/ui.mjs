import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { launchBrowser } from "./browser.mjs";

const appUrl = process.env.MINDCARE_APP_URL || "http://127.0.0.1:5173";
const adminUrl = process.env.MINDCARE_ADMIN_URL || "http://127.0.0.1:5180";
const apiUrl = process.env.MINDCARE_API_URL || "http://127.0.0.1:8080";
const adminPassword = process.env.MINDCARE_TEST_ADMIN_PASSWORD;
const integrationKey = `integration-${Date.now().toString(36)}`;
const integrationTitle = `联调量表${Date.now()}`;
if (!adminPassword || process.env.MINDCARE_ISOLATED_TEST_DB !== "1") {
	throw new Error("Set MINDCARE_TEST_ADMIN_PASSWORD and MINDCARE_ISOLATED_TEST_DB=1 for an isolated test database");
}
if (![appUrl, adminUrl, apiUrl].every((url) => new URL(url).hostname === "127.0.0.1")) {
	throw new Error("UI integration tests only run against local isolated services");
}

const browser = await launchBrowser();
const userContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const user = await userContext.newPage();
const admin = await adminContext.newPage();
const errors = [];
const failedRequests = [];
for (const page of [user, admin]) {
	page.on("pageerror", (error) => errors.push(`${page === user ? "app" : "admin"}: ${error.message}`));
	page.on("response", (response) => {
		if (response.status() >= 500 && /mindcare|login|captcha|user\/getInfo/.test(response.url())) {
			failedRequests.push(`${response.status()} ${response.url()}`);
		}
	});
}
const button = (name) => user.locator("uni-button").filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).last();
const input = (name) => user.locator(`uni-input[aria-label="${name}"] input`);
const visit = async (route, { expectBootstrap = true } = {}) => {
	await user.goto(`${appUrl}/#/pages/${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
	const synced = expectBootstrap
		? user.waitForResponse((response) => response.url().includes("/app/mindcare/bootstrap") && response.status() === 200, { timeout: 30000 })
		: null;
	await user.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
	await user.locator(".app-shell").waitFor();
	if (synced) await synced;
};
const check = async (label, callback) => {
	try {
		await callback();
		console.log(`PASS ${label}`);
	} catch (error) {
		console.error(`FAIL ${label}: ${error.message}`);
		console.error(`App URL: ${user.url()}`);
		console.error((await user.locator("body").innerText()).slice(0, 700));
		console.error(`Admin URL: ${admin.url()}`);
		console.error((await admin.locator("body").innerText()).slice(0, 700));
		console.error(`Admin form errors: ${JSON.stringify(await admin.locator(".el-form-item__error, .el-message").allTextContents())}`);
		console.error(`HTTP errors: ${JSON.stringify(failedRequests)}`);
		throw error;
	}
};
const api = async (path, options = {}) => {
	const response = await fetch(`${apiUrl}${path}`, options);
	return response.json();
};
let adminToken;
let testClientId;
const adminApi = (path, options = {}) => api(path, {
	...options,
	headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json", ...options.headers },
});

try {
	await check("用户端内容同步、搜索与空结果", async () => {
		await visit("index/index");
		await user.locator(".assessment-card").first().waitFor();
		await user.locator(".search-box input").fill("不存在的量表");
		await user.locator(".empty").waitFor();
		await user.locator('[aria-label="清空搜索"]').click();
		await user.locator(".assessment-card").first().waitFor();
	});

	await check("后台登录与运营概览", async () => {
		await admin.goto(`${adminUrl}/login`);
		await admin.getByPlaceholder("账号").fill("admin");
		await admin.getByPlaceholder("密码").fill(adminPassword);
		await admin.getByRole("button", { name: /登 录/ }).click();
		await admin.waitForFunction(() => document.cookie.includes("Admin-Token="), undefined, { timeout: 30000 });
		adminToken = (await adminContext.cookies(adminUrl)).find((cookie) => cookie.name === "Admin-Token")?.value;
		assert.ok(adminToken, "管理员登录后应获得 token");
		await admin.goto(`${adminUrl}/mindcare/dashboard`);
		await admin.getByText("运营概览", { exact: true }).first().waitFor();
		assert.equal((await adminApi("/mindcare/dashboard")).code, 200);
	});

	await check("完整测评、服务端计分和报告同步", async () => {
		await visit("assessment/detail?id=emotion");
		await button("开始测评").click();
		await user.locator(".question").waitFor();
		for (let i = 0; i < 20; i++) {
			await button("偶尔").click();
			await button(i === 19 ? "提交测评" : "下一题").click();
		}
		await user.locator(".score").waitFor();
		assert.equal((await user.locator(".score").innerText()).trim(), "33");
		await user.waitForTimeout(500);
		const data = await adminApi("/mindcare/record/list?recordType=assessment&pageNum=1&pageSize=10");
		assert.equal(data.code, 200);
		const report = data.rows.find((row) => row.score === 33 && row.recordType === "assessment");
		assert.ok(report);
		testClientId = report.clientId;
		const forbidden = await adminApi(`/mindcare/record/${report.recordId}/status`, { method: "PUT", body: JSON.stringify({ status: "pending" }) });
		assert.notEqual(forbidden.code, 200, "测评结果不能被人工改为待处理");
	});

	await check("咨询提交、后台确认、用户端刷新状态", async () => {
		await visit("consultation/booking");
		await button("提交预约").click();
		assert.match(await user.locator(".error-text").innerText(), /称呼/);
		await input("称呼").fill("联调测试");
		await input("联系手机").fill("13800138000");
		await user.locator('uni-textarea[aria-label="咨询留言"] textarea').fill("希望了解咨询流程");
		await button("提交预约").click();
		await user.locator(".record-card").first().waitFor();
		await user.waitForTimeout(500);
		const data = await adminApi("/mindcare/record/list?recordType=consultation&pageNum=1&pageSize=10");
		const row = data.rows.find((item) => item.contactPhone === "13800138000");
		assert.ok(row, "后台应看到用户预约");
		await admin.goto(`${adminUrl}/mindcare/consultations`);
		const recordRow = admin.locator(".el-table__row").filter({ hasText: "13800138000" }).first();
		await recordRow.waitFor();
		await recordRow.getByRole("button", { name: "处理" }).click();
		await admin.locator(".el-dialog").getByText("待处理", { exact: true }).click();
		await admin.locator(".el-select-dropdown__item").filter({ hasText: "已确认" }).last().click();
		await admin.getByRole("button", { name: "确认更新" }).click();
		await admin.getByText("状态已更新").waitFor();
		await visit("profile/records?filter=咨询");
		await user.locator(".record-card").filter({ hasText: "已确认" }).first().waitFor();
		await visit("consultation/booking");
		await input("称呼").fill("联调测试");
		await input("联系手机").fill("13800138000");
		await button("提交预约").click();
		assert.match(await user.locator(".error-text").innerText(), /已预约/);
	});

	await check("活动报名校验、成功页和重复报名拦截", async () => {
		const observer = { clientId: `mc_observer_${Date.now().toString(36)}`, token: randomBytes(32).toString("hex") };
		assert.equal((await api("/app/mindcare/client/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(observer) })).code, 200);
		const observerContent = () => api("/app/mindcare/bootstrap", { headers: { "X-Client-Id": observer.clientId, "X-Client-Token": observer.token } });
		const before = (await observerContent()).data.activities.find((activity) => activity.id === "forest").enrolled;
		await visit("activities/signup?id=forest");
		await input("姓名").fill("报名测试");
		await input("联系手机").fill("13900139000");
		await button("提交报名").click();
		assert.match(await user.locator(".error-text").innerText(), /紧急联系人/);
		await input("紧急联系人").fill("家人 13800138000");
		await button("提交报名").click();
		await user.locator(".success-title").waitFor();
		assert.equal((await user.locator(".success-title").innerText()).trim(), "报名成功");
		let current = before;
		for (let i = 0; i < 20 && current === before; i++) {
			current = (await observerContent()).data.activities.find((activity) => activity.id === "forest").enrolled;
			if (current === before) await user.waitForTimeout(250);
		}
		assert.equal(current, before + 1, "其他终端应看到最新报名人数");
		await visit("activities/detail?id=forest");
		assert.match(await user.locator(".page-content").innerText(), new RegExp(`已报名${before + 1}人`));
		await visit("activities/signup?id=forest");
		await input("姓名").fill("报名测试");
		await input("联系手机").fill("13900139000");
		await input("紧急联系人").fill("家人 13800138000");
		await button("提交报名").click();
		assert.match(await user.locator(".error-text").innerText(), /已报名/);
	});

	await check("多人同时报名不会超过活动容量", async () => {
		const suffix = Date.now().toString(36);
		const key = `capacity-check-${suffix}`;
		const title = `并发容量测试${suffix}`;
		const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
		const content = { contentKey: key, contentType: "activity", title, category: "测试", summary: "隔离库并发测试", status: "0", sortOrder: 99,
			payloadJson: JSON.stringify({ id: key, title, date, time: "10:00–11:00", location: "测试地点", capacity: 1, enrolled: 0, status: "报名中", art: "walking", hero: "forest", intro: "测试活动", schedule: [["10:00", "签到", "测试说明"]] }) };
		assert.equal((await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify(content) })).code, 200);
		const list = await adminApi(`/mindcare/content/list?contentType=activity&title=${encodeURIComponent(title)}&pageNum=1&pageSize=10`);
		const row = list.rows.find((item) => item.contentKey === key);
		assert.ok(row);
		try {
			const clients = Array.from({ length: 8 }, (_, index) => ({ clientId: `mc_capacity_${suffix}_${index}`, token: randomBytes(32).toString("hex") }));
			for (const client of clients) {
				assert.equal((await api("/app/mindcare/client/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(client) })).code, 200);
			}
			const submit = (client, index) => api("/app/mindcare/records", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Client-Id": client.clientId, "X-Client-Token": client.token },
				body: JSON.stringify({ recordKey: `capacity-${suffix}-${index}`, recordType: "activity", contentKey: key, contactName: "并发测试", contactPhone: "13800138000", status: "submitted", dataJson: JSON.stringify({ count: 1, emergency: "家人 13800138000" }) }),
			});
			const results = await Promise.all(clients.map(submit));
			const accepted = results.filter((result) => result.code === 200).length;
			assert.equal(accepted, 1, `capacity 1 accepted ${accepted} concurrent signups: ${JSON.stringify(results.map((result) => result.msg))}`);
			const winner = results.findIndex((result) => result.code === 200);
			assert.equal((await submit(clients[winner], winner)).code, 200, "retrying an accepted signup should stay idempotent");
			const records = await adminApi(`/mindcare/record/list?recordType=activity&title=${encodeURIComponent(title)}&pageNum=1&pageSize=20`);
			assert.equal(records.rows.filter((item) => item.contentKey === key).length, 1);
		} finally {
			assert.equal((await adminApi(`/mindcare/content/${row.contentId}`, { method: "DELETE" })).code, 200);
		}
	});

	await check("课程空视频有明确提示", async () => {
		await visit("courses/detail?id=stress");
		await button("继续观看").or(button("开始观看")).click();
		assert.match(await user.locator(".notice").innerText(), /正在准备/);
	});

	await check("真实视频播放与课程进度同步", async () => {
		const key = `video-check-${Date.now().toString(36)}`;
		const mediaKey = `video-${key}`;
		const mediaSize = await user.evaluate(async (name) => {
			const canvas = document.createElement("canvas");
			canvas.width = 160;
			canvas.height = 90;
			const context = canvas.getContext("2d");
			const stream = canvas.captureStream(12);
			const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
			const recorder = new MediaRecorder(stream, { mimeType });
			const chunks = [];
			recorder.ondataavailable = (event) => chunks.push(event.data);
			const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
			recorder.start(200);
			for (let i = 0; i < 25; i++) {
				context.fillStyle = i % 2 ? "#567466" : "#bdcdbb";
				context.fillRect(0, 0, 160, 90);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			recorder.stop();
			await stopped;
			stream.getTracks().forEach((track) => track.stop());
			const blob = new Blob(chunks, { type: "video/webm" });
			const db = await new Promise((resolve, reject) => {
				const request = indexedDB.open("mindcare-media", 1);
				request.onupgradeneeded = () => request.result.createObjectStore("media");
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			await new Promise((resolve, reject) => {
				const transaction = db.transaction("media", "readwrite");
				transaction.objectStore("media").put(blob, name);
				transaction.oncomplete = resolve;
				transaction.onerror = () => reject(transaction.error);
			});
			db.close();
			return blob.size;
		}, mediaKey);
		assert.ok(mediaSize > 1000, "测试视频应包含真实媒体字节");
		const title = `播放测试${key}`;
		const payload = { id: key, title, category: "情绪管理", minutes: 1, learners: "0", art: "meadow", hero: "video", teacher: "测试", intro: "播放验证", video: "", mediaKey, chapters: [{ title: "完整课程", duration: "00:03" }] };
		const created = await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify({ contentKey: key, contentType: "course", title, category: payload.category, summary: payload.intro, payloadJson: JSON.stringify(payload), status: "0", sortOrder: 99 }) });
		assert.equal(created.code, 200);
		const list = await adminApi(`/mindcare/content/list?contentType=course&title=${encodeURIComponent(title)}&pageNum=1&pageSize=10`);
		const row = list.rows.find((item) => item.contentKey === key);
		assert.ok(row);
		try {
			await visit(`courses/detail?id=${key}`);
			await button("开始观看").click();
			await user.locator("video").waitFor();
			await user.waitForFunction(() => document.querySelector("video")?.readyState >= 2, undefined, { timeout: 15000 });
			await user.waitForFunction(() => document.querySelector("video")?.currentTime > 0.3, undefined, { timeout: 15000 });
			await visit("profile/records?filter=课程");
			let syncedProgress;
			for (let i = 0; i < 20; i++) {
				const records = await adminApi(`/mindcare/record/list?recordType=course&title=${encodeURIComponent(title)}&pageNum=1&pageSize=10`);
				syncedProgress = records.rows.find((item) => item.contentKey === key);
				if (syncedProgress) break;
				await user.waitForTimeout(250);
			}
			assert.ok(syncedProgress, "播放进度应同步至后台");
			assert.ok(Number(syncedProgress.progress) > 0);
		} finally {
			assert.equal((await adminApi(`/mindcare/content/${row.contentId}`, { method: "DELETE" })).code, 200);
		}
	});

	await check("后台发布内容后用户可见，下架后用户不可见", async () => {
		await admin.goto(`${adminUrl}/mindcare/assessments`);
		await admin.getByRole("button", { name: "新增量表" }).click();
		const dialog = admin.locator(".el-dialog").last();
		await dialog.locator(".el-form-item").filter({ hasText: "标题" }).locator("input").fill(integrationTitle);
		await dialog.locator(".el-form-item").filter({ hasText: "内容标识" }).locator("input").fill(integrationKey);
		await dialog.getByRole("button", { name: "保存" }).click();
		await dialog.waitFor({ state: "hidden" });
		await admin.locator(".el-table__row").filter({ hasText: integrationTitle }).waitFor();
		await visit("index/index");
		await user.locator(".search-box input").fill(integrationTitle);
		await user.locator(".assessment-card").filter({ hasText: integrationTitle }).waitFor();
		const data = await adminApi(`/mindcare/content/list?contentType=assessment&title=${encodeURIComponent(integrationTitle)}&pageNum=1&pageSize=10`);
		const row = data.rows.find((item) => item.contentKey === integrationKey);
		assert.ok(row);
		const update = await adminApi("/mindcare/content", { method: "PUT", body: JSON.stringify({ ...row, status: "1" }) });
		assert.equal(update.code, 200);
		await visit("index/index");
		await user.locator(".search-box input").fill(integrationTitle);
		await user.locator(".empty").waitFor();
		assert.equal((await adminApi(`/mindcare/content/${row.contentId}`, { method: "DELETE" })).code, 200);
	});

	await check("后台拒绝不完整内容、非对象 JSON 和未授权访问", async () => {
		const base = { contentKey: `invalid-${Date.now().toString(36)}`, contentType: "assessment", title: "不完整量表", category: "情绪", summary: "", status: "0", sortOrder: 0 };
		const invalidScale = await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify({ ...base, payloadJson: JSON.stringify({ id: base.contentKey, title: base.title, count: 2, minutes: 3, questions: ["仅一题"] }) }) });
		assert.notEqual(invalidScale.code, 200);
		const invalidObject = await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify({ ...base, payloadJson: "[]" }) });
		assert.notEqual(invalidObject.code, 200);
		const invalidActivity = await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify({ ...base, contentType: "activity", payloadJson: JSON.stringify({ id: base.contentKey, title: base.title, date: "", time: "", location: "", capacity: 0, enrolled: 0, schedule: [] }) }) });
		assert.notEqual(invalidActivity.code, 200);
		const unauthenticated = await api("/mindcare/dashboard");
		assert.notEqual(unauthenticated.code, 200);
		const clientId = `mc_concurrent_${Date.now().toString(36)}`;
		const token = randomBytes(32).toString("hex");
		const register = () => api("/app/mindcare/client/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, token, nickname: "并发测试" }) });
		assert.deepEqual((await Promise.all([register(), register()])).map((item) => item.code), [200, 200]);
		const wrongCredential = await api("/app/mindcare/bootstrap", { headers: { "X-Client-Id": clientId, "X-Client-Token": randomBytes(32).toString("hex") } });
		assert.notEqual(wrongCredential.code, 200);
	});

	await check("课程和活动发布、同步、下架与删除", async () => {
		const suffix = Date.now().toString(36);
		const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
		for (const item of [
			{ type: "course", key: `check-course-${suffix}`, title: `联调课程${suffix}`, route: "courses/index", selector: ".course-row", payload: { category: "情绪管理", minutes: 5, learners: "0", art: "meadow", hero: "video", teacher: "测试", intro: "测试课程", video: "", chapters: [{ title: "练习", duration: "05:00" }] } },
			{ type: "activity", key: `check-activity-${suffix}`, title: `联调活动${suffix}`, route: "activities/index", selector: ".event-card", payload: { date, time: "10:00–11:00", location: "测试地点", capacity: 20, enrolled: 0, status: "报名中", art: "walking", hero: "forest", intro: "测试活动", schedule: [["10:00", "签到", "测试说明"]] } },
		]) {
			const base = { contentKey: item.key, contentType: item.type, title: item.title, category: item.payload.category || "", summary: "集成测试", status: "0", sortOrder: 99, payloadJson: JSON.stringify({ id: item.key, title: item.title, ...item.payload }) };
			assert.equal((await adminApi("/mindcare/content", { method: "POST", body: JSON.stringify(base) })).code, 200);
			await visit(item.route);
			if (item.type === "course") await user.locator(".search-box input").fill(item.title);
			await user.locator(item.selector).filter({ hasText: item.title }).waitFor();
			const list = await adminApi(`/mindcare/content/list?contentType=${item.type}&title=${encodeURIComponent(item.title)}&pageNum=1&pageSize=10`);
			const row = list.rows.find((record) => record.contentKey === item.key);
			assert.ok(row);
			assert.equal((await adminApi("/mindcare/content", { method: "PUT", body: JSON.stringify({ ...row, status: "1" }) })).code, 200);
			await visit(item.route);
			if (item.type === "course") await user.locator(".search-box input").fill(item.title);
			await user.locator(item.selector).filter({ hasText: item.title }).waitFor({ state: "detached" });
			assert.equal((await adminApi(`/mindcare/content/${row.contentId}`, { method: "DELETE" })).code, 200);
		}
	});

	await check("后台七个业务页面和账号终端列表可用", async () => {
		for (const [route, heading] of [
			["dashboard", "运营概览"], ["assessments", "心理量表"], ["courses", "心理课程"],
			["activities", "疗愈活动"], ["consultations", "咨询预约"], ["records", "业务记录"],
			["clients", "用户账户与终端"],
		]) {
			await admin.goto(`${adminUrl}/mindcare/${route}`);
			await admin.locator("h2").filter({ hasText: heading }).waitFor();
		}
		const clients = await adminApi("/mindcare/client/list?pageNum=1&pageSize=10");
		assert.ok(clients.total >= 1);
		assert.equal((await adminApi("/mindcare/account/list?pageNum=1&pageSize=10")).code, 200);
	});

	await check("15 个用户端页面无运行时异常", async () => {
		for (const route of [
			"index/index", "assessment/detail?id=emotion", "assessment/quiz?id=emotion", "assessment/report",
			"consultation/index", "consultation/booking", "courses/index", "courses/detail?id=stress",
			"activities/index", "activities/detail?id=forest", "activities/signup?id=forest", "activities/success",
			"profile/index", "profile/records", "account/index",
		]) await visit(route);
	});

	await check("窄屏、常规手机与宽屏无横向溢出", async () => {
		for (const width of [320, 430, 1280]) {
			await user.setViewportSize({ width, height: 900 });
			for (const route of ["index/index", "consultation/booking", "activities/signup?id=forest", "profile/index", "profile/records", "account/index"]) {
				await visit(route);
				assert.ok(await user.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} overflows at ${width}px`);
			}
		}
		await user.setViewportSize({ width: 390, height: 844 });
	});

	await check("隐私清除同时删除本机和云端业务记录", async () => {
		await visit("profile/index");
		await button("隐私设置").click();
		await user.locator(".sheet").waitFor();
		await button("清除本机与云端记录").click();
		await user.getByText("确认清除", { exact: true }).last().click();
		for (let i = 0; i < 20; i++) {
			const result = await adminApi(`/mindcare/record/list?clientId=${encodeURIComponent(testClientId)}&pageNum=1&pageSize=10`);
			if (result.total === 0) break;
			await user.waitForTimeout(250);
		}
		assert.equal((await adminApi(`/mindcare/record/list?clientId=${encodeURIComponent(testClientId)}&pageNum=1&pageSize=10`)).total, 0);
		await visit("profile/records");
		assert.match(await user.locator(".records-heading").innerText(), /共 0 条/);
	});

	await check("离线提交可本机保留并在恢复联网后补传", async () => {
		await user.route("**/api/app/mindcare/records", (route) => route.request().method() === "POST" ? route.abort() : route.continue());
		await visit("consultation/booking");
		await input("称呼").fill("离线补传测试");
		await input("联系手机").fill("13700137000");
		await button("提交预约").click();
		await user.locator(".record-card").first().waitFor();
		await user.unroute("**/api/app/mindcare/records");
		await visit("profile/records?filter=咨询", { expectBootstrap: false });
		await user.locator(".record-card").first().waitFor();
		let uploaded = false;
		for (let i = 0; i < 20; i++) {
			const result = await adminApi(`/mindcare/record/list?clientId=${encodeURIComponent(testClientId)}&recordType=consultation&pageNum=1&pageSize=10`);
			uploaded = result.rows.some((row) => row.contactPhone === "13700137000");
			if (uploaded) break;
			await user.waitForTimeout(250);
		}
		assert.ok(uploaded, "恢复联网后应自动补传预约");
	});

	assert.deepEqual(failedRequests, []);
	assert.deepEqual(errors, []);
	console.log("PASS all current integration UI checks");
} finally {
	await browser.close();
}
