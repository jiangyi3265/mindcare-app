import { clearRecords, fetchBootstrap, registerClient, saveRecord } from "./api.js";
import { now, persist, state } from "./store.js";

const IDENTITY_KEY = "mindcare:identity:v1";
const timers = new Map();
let registrationPromise;
let flushPromise;

function randomPart(length) {
	if (globalThis.crypto?.getRandomValues) {
		const bytes = new Uint8Array(Math.ceil(length / 2));
		globalThis.crypto.getRandomValues(bytes);
		return Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
			.join("")
			.slice(0, length);
	}
	let value = "";
	while (value.length < length) {
		value += Math.random().toString(36).slice(2);
	}
	return value.slice(0, length);
}

function getIdentity() {
	const saved = uni.getStorageSync(IDENTITY_KEY);
	if (
		saved?.clientId &&
		saved?.token &&
		/^[A-Za-z0-9_-]{16,64}$/.test(saved.clientId) &&
		saved.token.length >= 32
	) return saved;
	const identity = {
		clientId: `mc_${Date.now().toString(36)}_${randomPart(18)}`,
		token: `${randomPart(32)}${randomPart(32)}`,
	};
	uni.setStorageSync(IDENTITY_KEY, identity);
	return identity;
}

async function ensureClient() {
	if (!registrationPromise) {
		const identity = getIdentity();
		registrationPromise = registerClient(identity, state.profile)
			.then(() => identity)
			.finally(() => { registrationPromise = undefined; });
	}
	return registrationPromise;
}

const parseData = (value) => {
	if (!value) return {};
	try { return typeof value === "string" ? JSON.parse(value) : value; }
	catch { return {}; }
};

const bookingStatus = (value) => ({
	submitted: "待确认", pending: "待确认", confirmed: "已确认",
	canceled: "已取消", completed: "已完成",
}[value] || value || "待确认");

function applyRecords(records = []) {
	const reports = [];
	const bookings = [];
	const enrollments = [];
	const messages = [];
	const progress = {};
	records.forEach((record) => {
		const data = parseData(record.dataJson);
		if (record.recordType === "assessment") {
			reports.push({ ...data, id: record.recordKey, scaleId: record.contentKey, title: record.title, score: record.score, date: data.date || record.createTime });
		} else if (record.recordType === "consultation") {
			bookings.push({ ...data, id: record.recordKey, title: record.title || data.title, status: bookingStatus(record.status), createdAt: data.createdAt || record.createTime });
		} else if (record.recordType === "course") {
			progress[record.contentKey] = { ...data, percent: Number(record.progress || 0), date: data.date || record.updateTime };
		} else if (record.recordType === "activity") {
			enrollments.push({ ...data, id: record.recordKey, eventId: record.contentKey, title: record.title || data.title, status: record.status === "canceled" ? "已取消" : "报名成功" });
		} else if (record.recordType === "message") {
			messages.push({ ...data, id: record.recordKey, status: record.status === "completed" ? "已回复" : "待回复", date: data.date || record.createTime });
		}
	});
	state.reports = reports;
	state.bookings = bookings;
	state.progress = progress;
	state.enrollments = enrollments;
	state.messages = messages;
}

function applyBootstrap(data) {
	state.serverScales = Array.isArray(data.assessments) ? data.assessments : [];
	state.serverCourses = Array.isArray(data.courses) ? data.courses : [];
	state.serverActivities = Array.isArray(data.activities) ? data.activities : [];
	state.serverContentLoaded = true;
	applyRecords(data.records);
	state.sync.status = "online";
	state.sync.error = "";
	state.sync.lastSyncedAt = now();
	persist();
}

export async function bootstrapMindcare({ silent = true } = {}) {
	state.sync.status = "syncing";
	try {
		const identity = await ensureClient();
		if (state.pendingClear) {
			await clearRecords(identity);
			state.pendingClear = false;
			state.pendingSync = [];
		}
		await flushPendingRecords(identity);
		const data = await fetchBootstrap(identity);
		applyBootstrap(data || {});
		return true;
	} catch (error) {
		state.sync.status = "offline";
		state.sync.error = error.message;
		persist();
		if (!silent) uni.showToast({ title: "已切换为离线模式", icon: "none" });
		return false;
	}
}

export async function flushPendingRecords(existingIdentity) {
	if (flushPromise) return flushPromise;
	flushPromise = (async () => {
		const identity = existingIdentity || await ensureClient();
		if (state.pendingClear) {
			await clearRecords(identity);
			state.pendingClear = false;
			state.pendingSync = [];
			persist();
		}
		while (state.pendingSync.length) {
			const pending = state.pendingSync[0];
			await saveRecord(identity, pending);
			state.pendingSync.shift();
			persist();
		}
	})().finally(() => { flushPromise = undefined; });
	return flushPromise;
}

export function queueRecord(record, delay = 0) {
	const index = state.pendingSync.findIndex((item) => item.recordKey === record.recordKey);
	if (index >= 0) state.pendingSync[index] = record;
	else state.pendingSync.push(record);
	persist();
	const currentTimer = timers.get(record.recordKey);
	if (currentTimer) clearTimeout(currentTimer);
	const run = () => {
		timers.delete(record.recordKey);
		flushPendingRecords().then(() => {
			state.sync.status = "online";
			state.sync.error = "";
			state.sync.lastSyncedAt = now();
			persist();
		}).catch((error) => {
			state.sync.status = "offline";
			state.sync.error = error.message;
			persist();
		});
	};
	if (delay > 0) timers.set(record.recordKey, setTimeout(run, delay));
	else run();
}

export function recordPayload(type, localRecord, overrides = {}) {
	return {
		recordKey: localRecord.id,
		recordType: type,
		contentKey: overrides.contentKey,
		title: overrides.title || localRecord.title || "",
		contactName: overrides.contactName || localRecord.name || "",
		contactPhone: overrides.contactPhone || localRecord.phone || "",
		status: overrides.status || "submitted",
		score: overrides.score,
		progress: overrides.progress,
		dataJson: JSON.stringify(localRecord),
	};
}

export async function syncProfile() {
	try {
		await ensureClient();
		state.sync.status = "online";
		state.sync.lastSyncedAt = now();
		persist();
	} catch (error) {
		state.sync.status = "offline";
		state.sync.error = error.message;
		persist();
	}
}

export function clearRemoteRecords() {
	state.pendingClear = true;
	state.pendingSync = [];
	persist();
	ensureClient().then((identity) => clearRecords(identity)).then(() => {
		state.pendingClear = false;
		persist();
	}).catch((error) => {
		state.sync.status = "offline";
		state.sync.error = error.message;
		persist();
	});
}
