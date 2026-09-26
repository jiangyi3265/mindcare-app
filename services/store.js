import { reactive } from "vue";
import { scales, courses, activities } from "../data/catalog.js";
const KEY = "mindcare:state:v1";
const seed = {
	profile: { name: "小林", phone: "" },
	account: null,
	reports: [
		{
			id: "sample-report",
			scaleId: "emotion",
			title: "情绪状态自评",
			score: 62,
			date: "2026-09-14 10:30",
			demo: true,
		},
	],
	bookings: [
		{
			id: "sample-booking",
			name: "小林",
			title: "情绪与压力咨询",
			date: "2026-09-18",
			time: "14:00",
			method: "视频咨询",
			status: "待确认",
			demo: true,
		},
	],
	progress: {
		stress: { percent: 60, seconds: 432, date: "2026-09-14 09:00" },
		breath: { percent: 60, seconds: 360, date: "2026-09-13 10:00" },
	},
	enrollments: [
		{
			id: "sample-signup",
			eventId: "forest",
			title: "周末森林疗愈散步",
			date: "2026-09-26",
			time: "09:30–11:30",
			location: "城市森林公园·南门",
			code: "GY20260926018",
			status: "报名成功",
			name: "小林",
			phone: "",
			count: 1,
			demo: true,
		},
	],
	drafts: {},
	customScales: [],
	customCourses: [],
	customActivities: [],
	adminDrafts: {},
	messages: [
		{
			id: "sample-message",
			name: "小林",
			text: "请问如何预约周五的咨询？",
			date: "今天 10:26",
			status: "待回复",
			demo: true,
		},
	],
	service: { corpId: "", url: "" },
	courseCategories: ["情绪管理", "亲子关系", "睡眠健康"],
	serverScales: [],
	serverCourses: [],
	serverActivities: [],
	serverBanners: [],
	serverExperts: [],
	serverBannersLoaded: false,
	serverContentLoaded: false,
	pendingSync: [],
	pendingClear: false,
	sync: { status: "idle", lastSyncedAt: "", error: "" },
};
function read() {
	const defaults = JSON.parse(JSON.stringify(seed));
	try {
		const saved = uni.getStorageSync(KEY);
		return saved && typeof saved === "object"
			? { ...defaults, ...saved }
			: defaults;
	} catch {
		return defaults;
	}
}
export const state = reactive(read());
export function persist() {
	try {
		uni.setStorageSync(KEY, JSON.parse(JSON.stringify(state)));
		return true;
	} catch {
		uni.showToast({ title: "本机存储空间不足，未能保存", icon: "none" });
		return false;
	}
}
export const id = (prefix) =>
	`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const now = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const merged = (base, custom) => {
	const map = new Map(base.map((item) => [item.id, item]));
	custom.forEach((item) => map.set(item.id, item));
	return [...map.values()];
};
export const allScales = () =>
	state.serverContentLoaded ? state.serverScales : merged(scales, state.customScales);
export const allCourses = () =>
	state.serverContentLoaded ? state.serverCourses : merged(courses, state.customCourses);
export const allActivities = () =>
	state.serverContentLoaded ? state.serverActivities : merged(activities, state.customActivities);
export const allBanners = () => state.serverBannersLoaded ? state.serverBanners : [
	{ id: 'home-welcome', title: '给心情，一点被看见的时间', image: 'builtin:hero' },
	{ id: 'home-rest', title: '慢下来，听见自己', image: 'builtin:rest' },
];
export const allExperts = () => state.serverContentLoaded ? state.serverExperts : [
	{ id: "expert-lin", name: "林老师", title: "林老师", photo: "builtin:avatar", credentials: "情绪与压力支持", profile: "擅长情绪管理、压力与睡眠议题。", methods: ["情绪管理", "压力调节"] },
	{ id: "expert-zhou", name: "周老师", title: "周老师", photo: "builtin:avatar", credentials: "亲子与关系支持", profile: "关注亲子沟通、人际关系与成长议题。", methods: ["亲子沟通", "人际关系"] },
];
export function resetData() {
	uni.removeStorageSync(KEY);
	Object.keys(state).forEach((k) => delete state[k]);
	Object.assign(state, JSON.parse(JSON.stringify(seed)));
	persist();
}

export function clearPersonalData() {
	state.account = null;
	state.profile = { name: "小林", phone: "" };
	state.reports = [];
	state.bookings = [];
	state.progress = {};
	state.enrollments = [];
	state.messages = [];
	state.drafts = {};
	state.pendingSync = [];
	state.pendingClear = false;
	persist();
}
