import { launchBrowser } from "./browser.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await launchBrowser();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
});
const page = await context.newPage(),
	errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const btn = (name) =>
	page
		.locator("uni-button")
		.filter({ hasText: new RegExp("^\\s*" + name + "\\s*$") })
		.last();
const input = (name) => page.locator(`uni-input[aria-label="${name}"] input`);
// Direct deep-link checks use a fresh document; uni-app caches pages on hash-only navigation.
const visit = async (path) => {
	await page.goto("http://127.0.0.1:5173/#/pages/" + path);
	await page.reload();
	await page.locator(".app-shell").waitFor();
	await page.waitForTimeout(160);
};
const check = async (name, fn) => {
	await fn();
	console.log("PASS " + name);
};
try {
	await check("首页分类与空搜索结果", async () => {
		await visit("index/index");
		await btn("睡眠").click();
		assert.equal(await page.locator(".assessment-card").count(), 1);
		await page.locator(".search-box input").fill("不存在的量表");
		await page.locator(".empty").waitFor();
		assert.match(await page.locator(".empty").innerText(), /没有找到/);
		await page.locator('[aria-label="清空搜索"]').click();
		await page.waitForFunction(
			() => document.querySelector(".search-box input").value === "",
		);
		assert.equal(await page.locator(".search-box input").inputValue(), "");
		assert.equal(await page.locator(".assessment-card").count(), 1);
	});
	await check("个人中心取消编辑、昵称保存与当前导航保持状态", async () => {
		await visit("profile/index");
		await page.locator('[aria-label="设置"]').click();
		await page.keyboard.press("Tab");
		assert.ok(
			await page.evaluate(
				() => !!document.activeElement.closest(".sheet"),
			),
		);
		const original = await input("昵称").inputValue();
		await input("昵称").fill("这次修改不保存");
		await page.keyboard.press("Escape");
		await page.locator(".sheet").waitFor({ state: "hidden" });
		assert.notEqual(
			await page.evaluate(() => document.body.style.overflow),
			"hidden",
		);
		await page.locator('[aria-label="设置"]').click();
		assert.equal(await input("昵称").inputValue(), original);
		await input("昵称").fill("认真照顾自己的小林");
		await btn("保存昵称").click();
		await page.locator(".sheet").waitFor({ state: "hidden" });
		await page.reload();
		assert.equal(
			await page.locator(".profile-identity .title").innerText(),
			"认真照顾自己的小林",
		);
		await page.locator(".tab-item.active").click();
		assert.equal(
			await page.locator(".profile-identity .title").innerText(),
			"认真照顾自己的小林",
		);
		assert.equal(
			await page.locator(".tab-item.active").getAttribute("aria-current"),
			"page",
		);
	});
	await check("测评漏答拦截、刷新续答、20题提交与记录持久化", async () => {
		await visit("assessment/detail?id=emotion");
		await btn("开始测评").click();
		await page.locator(".question").waitFor();
		await btn("下一题").click();
		assert.match(await page.locator(".question").innerText(), /情绪低落/);
		await btn("偶尔").click();
		await btn("下一题").click();
		await page.reload();
		await page.locator(".question").waitFor();
		assert.match(await page.locator(".question").innerText(), /日常活动/);
		for (let i = 1; i < 20; i++) {
			await btn("偶尔").click();
			await btn(i === 19 ? "提交测评" : "下一题").click();
		}
		await page.locator(".score").waitFor();
		assert.equal(await page.locator(".score").innerText(), "33");
		await visit("profile/records?filter=测评");
		assert.ok((await page.locator(".record-card").count()) >= 2);
	});
	await check("咨询预约校验、提交及管理员确认", async () => {
		await visit("consultation/booking");
		await btn("提交预约").click();
		assert.match(await page.locator(".error-text").innerText(), /称呼/);
		await input("称呼").fill("界面测试");
		await page.locator(".error-text").waitFor({ state: "hidden" });
		await input("联系手机").fill("13800138000");
		await btn("提交预约").click();
		await page.locator(".record-card").first().waitFor();
		assert.match(
			await page.locator(".page-content").innerText(),
			/情绪与压力咨询/,
		);
		await visit("admin/services?tab=咨询留言");
		await btn("确认预约").click();
		assert.match(await page.locator(".page-content").innerText(), /已确认/);
	});
	await check(
		"活动报名必填校验、报名成功、二维码及重复报名保护",
		async () => {
			await visit("activities/signup?id=forest");
			await input("姓名").fill("活动测试");
			await input("联系手机").fill("13900139000");
			await btn("提交报名").click();
			assert.match(
				await page.locator(".error-text").innerText(),
				/紧急联系人/,
			);
			await input("紧急联系人").fill("家人 13800138000");
			await btn("提交报名").click();
			await page.locator(".success-title").waitFor();
			assert.equal(
				await page.locator(".success-title").innerText(),
				"报名成功",
			);
			assert.ok((await page.locator(".qr-cell.dark").count()) > 100);
			await visit("activities/signup?id=forest");
			await input("姓名").fill("活动测试");
			await input("联系手机").fill("13900139000");
			await input("紧急联系人").fill("家人 13800138000");
			await btn("提交报名").click();
			assert.match(
				await page.locator(".error-text").innerText(),
				/已报名/,
			);
		},
	);
	await check("无视频素材的明确反馈", async () => {
		await visit("courses/detail?id=stress");
		await btn("继续观看").click();
		assert.match(await page.locator(".notice").innerText(), /正在准备/);
	});
	await check("未观看课程不会误标完成，选择章节不会伪造进度", async () => {
		await visit("courses/detail?id=emotion");
		assert.doesNotMatch(
			await page.locator(".chapter-list").innerText(),
			/已看完|学习中/,
		);
		await page.locator(".chapter").last().click();
		assert.doesNotMatch(
			await page.locator(".chapter-list").innerText(),
			/已看完|学习中/,
		);
		assert.match(await page.locator(".soft-card").innerText(), /已看0%/);
	});
	await check("记录按时间排序，底部操作栏不覆盖最后一项内容", async () => {
		await visit("profile/records?filter=测评");
		const dates = await page
			.locator(".record-card .body-title + .small")
			.allTextContents();
		assert.ok(dates[0].trim() > dates[1].trim(), "新报告应排在旧报告之前");
		assert.equal(
			await page.locator(".records-heading").innerText(),
			"最近记录\n共 2 条",
		);
		for (const route of [
			"consultation/booking",
			"activities/signup?id=forest",
			"assessment/quiz",
		]) {
			await visit(route);
			await page.evaluate(() =>
				window.scrollTo(0, document.documentElement.scrollHeight),
			);
			await page.waitForTimeout(100);
			assert.ok(
				await page.evaluate(
					() =>
						document
							.querySelector(".page-content")
							.getBoundingClientRect().bottom <=
						document
							.querySelector(".fixed-footer")
							.getBoundingClientRect().top,
				),
				route,
			);
		}
	});
	await check("JSON量表真实上传、发布、用户端可查询", async () => {
		await visit("admin/scales");
		await btn("新建").click();
		const chooser = page.waitForEvent("filechooser");
		await page.locator(".upload-box").click();
		await (
			await chooser
		).setFiles({
			name: "test-scale.json",
			mimeType: "application/json",
			buffer: Buffer.from(
				JSON.stringify({
					title: "测试导入量表",
					questions: ["问题一", "问题二"],
					minutes: 2,
					category: "情绪",
				}),
			),
		});
		await page.waitForFunction(
			() =>
				document.querySelector('uni-input[aria-label="量表名称"] input')
					?.value === "测试导入量表",
		);
		await btn("发布量表").click();
		await page.getByText("测试导入量表", { exact: true }).waitFor();
		await visit("index/index");
		await page.locator(".search-box input").fill("测试导入");
		await page
			.locator(".assessment-card")
			.filter({ hasText: "测试导入量表" })
			.waitFor();
	});
	await check("视频本机上传、发布、播放及刷新后读取", async () => {
		await visit("admin/courses");
		const bytes = await page.evaluate(async () => {
			const canvas = document.createElement("canvas");
			canvas.width = 320;
			canvas.height = 180;
			const ctx = canvas.getContext("2d");
			ctx.fillStyle = "#718379";
			ctx.fillRect(0, 0, 320, 180);
			const stream = canvas.captureStream(10);
			const recorder = new MediaRecorder(stream, {
				mimeType: "video/webm",
			});
			const chunks = [];
			recorder.ondataavailable = (e) => chunks.push(e.data);
			const finished = new Promise(
				(resolve) =>
					(recorder.onstop = async () =>
						resolve(
							Array.from(
								new Uint8Array(
									await new Blob(chunks).arrayBuffer(),
								),
							),
						)),
			);
			recorder.start();
			for (let i = 0; i < 12; i++) {
				ctx.fillStyle = i % 2 ? "#718379" : "#607367";
				ctx.fillRect(0, 0, 320, 180);
				await new Promise((r) => setTimeout(r, 100));
			}
			recorder.stop();
			stream.getTracks().forEach((t) => t.stop());
			return finished;
		});
		await input("课程名称").fill("自动化视频课程");
		const chooser = page.waitForEvent("filechooser");
		await page.locator(".upload-box").click();
		await (
			await chooser
		).setFiles({
			name: "test-lesson.webm",
			mimeType: "video/webm",
			buffer: Buffer.from(bytes),
		});
		await page.getByText("已上传", { exact: true }).waitFor();
		await btn("发布课程").click();
		const card = page
			.locator(".card")
			.filter({ hasText: "自动化视频课程" });
		await card.waitFor();
		await card
			.locator("uni-button")
			.filter({ hasText: "预览课程" })
			.click();
		await btn("开始观看").click();
		await page.locator("video").waitFor();
		await page.waitForFunction(
			() => document.querySelector("video")?.readyState >= 2,
		);
		await page.reload();
		await btn("开始观看").or(btn("继续观看")).click();
		await page.locator("video").waitFor();
		await page.waitForFunction(
			() => document.querySelector("video")?.readyState >= 2,
		);
	});
	await check("活动发布、管理员报名名单和用户搜索", async () => {
		await visit("admin/services");
		await btn("发布活动通知").click();
		await input("活动名称").fill("测试公益活动");
		await input("集合地点").fill("社区服务中心");
		await page
			.locator('uni-textarea[aria-label="活动介绍"] textarea')
			.fill("一起学习心理健康知识。");
		await btn("发布活动").click();
		await page
			.locator(".admin-event")
			.filter({ hasText: "测试公益活动" })
			.waitFor();
		await visit("activities/index");
		await page.getByText("测试公益活动", { exact: true }).waitFor();
		await visit("admin/services?tab=用户管理");
		await page.locator(".search-box input").fill("13900139000");
		assert.equal(await page.locator(".admin-user").count(), 1);
	});
	await check("客服配置校验与留言处理", async () => {
		await visit("admin/index");
		await page
			.locator("uni-button")
			.filter({ hasText: "微信客服配置" })
			.click();
		await btn("保存配置").click();
		assert.match(await page.locator(".error-text").innerText(), /企业/);
		await page.locator('[aria-label="关闭"]').click();
		await visit("admin/services?tab=咨询留言");
		await btn("标记已处理").click();
		assert.match(await page.locator(".page-content").innerText(), /已处理/);
	});
	await check("320px及宽屏布局无横向溢出", async () => {
		for (const width of [320, 430, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const route of [
				"index/index",
				"profile/index",
				"profile/records",
				"consultation/booking",
			]) {
				await visit(route);
				assert.ok(
					await page.evaluate(
						() =>
							document.documentElement.scrollWidth <= innerWidth,
					),
				);
				assert.ok(
					await page
						.locator(".app-shell")
						.evaluate(
							(el) => el.getBoundingClientRect().width <= 430,
						),
				);
			}
		}
	});
	assert.deepEqual(errors, []);
	console.log("All UI flows passed; no page errors.");
} catch (error) {
	await fs.mkdir("test-results", { recursive: true });
	await page.screenshot({
		path: "test-results/ui-failure.png",
		fullPage: true,
	});
	throw error;
} finally {
	await browser.close();
}
