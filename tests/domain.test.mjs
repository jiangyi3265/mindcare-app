import test from "node:test";
import assert from "node:assert/strict";
import {
	calculateScore,
	validateContact,
	validateEnrollment,
	parseScale,
} from "../services/domain.js";
test("计分拒绝漏答与无效选项，并正确计算边界", () => {
	assert.equal(calculateScore([0, 0], 2), 0);
	assert.equal(calculateScore([3, 3], 2), 100);
	assert.equal(calculateScore([1, 2], 2), 50);
	assert.throws(() => calculateScore([1, null], 2));
	assert.throws(() => calculateScore([4, 2], 2));
	assert.throws(() => calculateScore([1], 2));
});
test("预约检查姓名、手机号及隐私同意", () => {
	assert.ok(validateContact("", "13800138000", true));
	assert.ok(validateContact("林", "123", true));
	assert.ok(validateContact("林", "13800138000", false));
	assert.equal(validateContact("林", "13800138000", true), "");
});
test("报名拒绝重复报名、超额人数、无效紧急联系人与已结束活动", () => {
	const event = {
		id: "forest",
		capacity: 30,
		enrolled: 28,
		status: "报名中",
	};
	const form = {
		name: "林",
		phone: "13800138000",
		consent: true,
		count: 1,
		emergency: "王 13900139000",
	};
	assert.equal(validateEnrollment(form, event), "");
	assert.ok(validateEnrollment({ ...form, count: 3 }, event));
	assert.ok(validateEnrollment({ ...form, emergency: "王" }, event));
	assert.ok(validateEnrollment(form, { ...event, status: "已结束" }));
	assert.ok(
		validateEnrollment(form, event, [
			{ eventId: "forest", phone: form.phone, count: 1 },
		]),
	);
	assert.equal(
		validateEnrollment(form, event, [
			{ eventId: "forest", phone: form.phone, count: 1, demo: true },
		]),
		"",
	);
	assert.equal(
		validateEnrollment(form, event, [
			{ eventId: "forest", phone: form.phone, count: 1, status: "已取消" },
		]),
		"",
	);
});
test("导入量表拒绝非法结构并计算题数", () => {
	assert.throws(() => parseScale("{"));
	assert.throws(() => parseScale('{"title":"量表","questions":[]}'));
	assert.throws(() => parseScale('{"title":"量表","questions":[{}]}'));
	assert.equal(
		parseScale('{"title":"量表","questions":["问题一","问题二"]}').count,
		2,
	);
});
