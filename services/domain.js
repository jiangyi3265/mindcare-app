export function calculateScore(answers, count) {
	if (
		!Number.isInteger(count) ||
		count < 1 ||
		answers.length !== count ||
		answers.some((v) => !Number.isInteger(v) || v < 0 || v > 3)
	)
		throw new Error("请完成所有题目");
	return Math.round(
		(answers.reduce((sum, v) => sum + v, 0) / (count * 3)) * 100,
	);
}
export function validateContact(name, phone, consent) {
	if (!name.trim()) return "请填写称呼或姓名";
	if (!/^1[3-9]\d{9}$/.test(phone.trim())) return "请填写正确的11位手机号";
	if (!consent) return "请先阅读并同意隐私说明";
	return "";
}
export function validateEnrollment(form, event, records = []) {
	const error = validateContact(form.name, form.phone, form.consent);
	if (error) return error;
	if (event.status !== "报名中") return "此活动暂未开放报名";
	if (!Number.isInteger(form.count) || form.count < 1)
		return "请选择有效的参加人数";
	const taken = records
		.filter(
			(r) => r.eventId === event.id && !r.demo && r.status !== "已取消",
		)
		.reduce((n, r) => n + r.count, 0);
	if (form.count > event.capacity - event.enrolled - taken)
		return "剩余名额不足，请调整参加人数";
	if (
		records.some(
			(r) =>
				r.eventId === event.id &&
				r.phone === form.phone &&
				!r.demo &&
				r.status !== "已取消",
		)
	)
		return "你已报名该活动，请在我的活动中查看";
	if (!form.emergency.trim()) return "请填写紧急联系人及手机号";
	if (!/1[3-9]\d{9}/.test(form.emergency))
		return "请在紧急联系人中填写有效手机号";
	return "";
}
export function parseScale(source) {
	const data = JSON.parse(source);
	if (
		typeof data.title !== "string" ||
		!data.title.trim() ||
		!Array.isArray(data.questions) ||
		!data.questions.length
	)
		throw new Error("量表需包含文本 title 和 questions 数组");
	if (
		data.minutes !== undefined &&
		(!Number.isFinite(data.minutes) || data.minutes < 1)
	)
		throw new Error("预计时长必须为正数");
	if (data.category !== undefined && typeof data.category !== "string")
		throw new Error("分类必须为文本");
	if (data.questions.some((q) => typeof q !== "string" || !q.trim()))
		throw new Error("每道题目必须为非空文本");
	if (data.questions.length > 200) throw new Error("单份量表最多200题");
	return {
		title: data.title.trim(),
		questions: data.questions.map((q) => q.trim()),
		description:
			typeof data.description === "string" ? data.description : "",
		count: data.questions.length,
		minutes: data.minutes || 5,
		category: data.category || "情绪",
		art: "flowers",
		hero: "rest",
	};
}
export function safeVideoUrl(url) {
	return /^https:\/\//i.test(url) || /^(blob:|wxfile:|\/|file:)/i.test(url);
}
