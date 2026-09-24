<template>
	<AppShell v-if="mode === 'home'" title="我的" tab="profile">
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="设置"
				@click="openSettings"
			>
				<UiIcon name="gear-six" /></button
		></template>
		<view class="profile-top"
			><view class="profile-art"><Artwork name="profileLeaves" /></view
			><view class="row gap profile-identity"
				><view class="avatar"
					><Artwork name="avatar" :aspect="1" /></view
				><view class="profile-copy grow"
					><text class="title block">{{ state.account ? state.profile.name : "访客" }}</text
					><text class="small muted block mt-xs"
						>{{ state.account ? maskedPhone + " · 记录已关联账号" : "登录后，记录可在其他设备找回" }}</text
					></view
				></view
			></view
		>
		<view class="pad"
			><view v-if="!state.account" class="auth-prompt">
				<text class="body-title block">让记录跟随你的账号</text>
				<text class="small muted block mt-xs">手机号登录后，测评、预约和活动记录会归属同一账号。</text>
				<button class="ui-reset button mt-sm" @click="go('account', { mode: 'login' })">登录或注册</button>
			</view
			><view class="stats card"
				><button
					class="ui-reset"
					v-for="stat in stats"
					:key="stat.label"
					@click="go('records', { filter: stat.label })"
				>
					<text class="stat-number">{{ stat.value }}</text
					><text>{{ stat.label }}</text>
				</button></view
			>
			<button class="ui-reset health-card" @click="go('records')">
				<UiIcon name="plant" tone="primary" :size="76" /><view
					class="grow"
					><text class="body-title block">我的健康档案</text
					><text class="tiny muted">记录每一次内心的变化</text></view
				><text class="badge solid">查看记录</text>
			</button>
			<view class="card menu-card mt-sm"
				><button
					v-for="item in menus"
					:key="item.label"
					class="ui-reset list-row"
					@click="go('records', { filter: item.filter })"
				>
					<UiIcon :name="item.icon" :size="42" /><text class="grow">{{
						item.label
					}}</text
					><text class="meta">{{ item.count }}</text
					><UiIcon
						name="caret-right"
						tone="muted"
						:size="27"
					/></button
			></view>
			<view class="card menu-card mt-sm"
				><button class="ui-reset list-row" @click="contactCustomer">
					<UiIcon name="headset" :size="42" /><text class="grow"
						>联系客服</text
					><UiIcon
						name="caret-right"
						tone="muted"
						:size="27"
					/></button
				><button class="ui-reset list-row" @click="privacy = true">
					<UiIcon name="shield-check" :size="42" /><text class="grow"
						>隐私设置</text
					><UiIcon
						name="caret-right"
						tone="muted"
						:size="27"
					/></button
				><button class="ui-reset list-row" @click="about">
					<UiIcon name="info" :size="42" /><text class="grow"
						>关于平台</text
					><UiIcon
						name="caret-right"
						tone="muted"
						:size="27"
					/></button
			></view>
			<view class="footer-note"
				>免费公益心理服务<br />让更多人被看见、被理解</view
			>
		</view>
	</AppShell>
	<AppShell v-else title="我的记录" back>
		<view class="pad"
			><view class="chip-row record-filters"
				><button
					v-for="item in ['全部', '测评', '咨询', '课程', '活动']"
					:key="item"
					class="ui-reset chip"
					:class="{ active: filter === item }"
					@click="filter = item"
				>
					{{ item }}
				</button></view
			><view class="between records-heading mb"
				><text class="subtitle">最近记录</text
				><text class="small muted"
					>共 {{ records.length }} 条</text
				></view
			>
			<view class="stack"
				><view
					v-for="record in records"
					:key="record.id"
					class="card record-card"
					><view class="round-icon"
						><UiIcon
							:name="record.icon"
							tone="primary"
							:size="44" /></view
					><view class="grow"
						><view class="between"
							><text class="small muted">{{
								record.typeLabel
							}}</text
							><text
								class="badge"
								:class="{
									peach: record.status === '待确认',
									neutral: record.status === '已取消',
								}"
								>{{ record.status }}</text
							></view
						><text class="body-title block mt-xs">{{
							record.title
						}}</text
						><text class="small muted block mt-xs">{{
							record.date
						}}</text
						><text
							v-if="record.type === '咨询'"
							class="tiny muted block mt-sm"
							>{{
								record.status === "待确认"
									? "已提交预约，等待客服确认"
									: record.status === "已取消"
										? "本次预约已取消，可重新预约"
										: "查看预约安排与咨询方式"
							}}</text
						><view
							v-if="record.type === '课程'"
							class="progress-track mt-sm"
							><view
								class="progress-fill"
								:style="{
									width: record.percent + '%',
								}" /></view
						><view class="record-action"
							><button
								class="ui-reset button outline tiny-button"
								@click="openRecord(record)"
							>
								{{ record.action }}
							</button></view
						></view
					></view
				></view
			>
			<view v-if="!records.length" class="empty"
				><UiIcon name="clipboard-text" :size="76" tone="muted" /><text
					class="block mt"
					>还没有{{ filter === "全部" ? "相关" : filter }}记录</text
				><text class="small block mt-xs"
					>每一次体验，都会在这里留下足迹。</text
				><button
					class="ui-reset button outline empty-action mt"
					@click="go(emptyAction.route)"
				>
					{{ emptyAction.label }}
				</button></view
			><view class="footer-note"
				>保存每一次成长<br />都是与更好的自己相遇</view
			>
		</view>
	</AppShell>
	<view
		v-if="settings || privacy || booking"
		class="modal-scrim"
		@click="close"
		><view
			class="sheet"
			role="dialog"
			aria-modal="true"
			:aria-label="settings ? '设置' : privacy ? '隐私设置' : '咨询预约'"
			@click.stop
		>
			<template v-if="settings"
				><view class="sheet-heading"
					><text>设置</text
					><button
						class="ui-reset icon-button"
						aria-label="关闭"
						@click="close"
					>
						<UiIcon name="x" /></button></view
				><view class="form-field"
					><text class="form-label">昵称</text
					><input
						class="input"
						v-model="nickname"
						maxlength="20"
						placeholder="请输入昵称"
						aria-label="昵称" /></view
				><button
					class="ui-reset button"
					:disabled="
						!nickname.trim() ||
						nickname.trim() === state.profile.name
					"
					@click="saveName"
				>
					保存昵称</button
				><button
					class="ui-reset list-row mt"
					@click="openAdminConsole"
				>
					<UiIcon name="gear-six" /><text class="grow"
						>管理工作台</text
					><UiIcon name="caret-right" :size="28" /></button
				><button
					v-if="state.account"
					class="ui-reset list-row"
					:disabled="loggingOut"
					@click="confirmLogout"
				>
					<UiIcon name="sign-out" /><text class="grow">{{ loggingOut ? "正在退出…" : "退出登录" }}</text>
					<UiIcon name="caret-right" :size="28" /></button
			></template>
			<template v-if="privacy"
				><view class="sheet-heading"
					><text>隐私设置</text
					><button
						class="ui-reset icon-button"
						aria-label="关闭"
						@click="close"
					>
						<UiIcon name="x" /></button></view
				><text class="muted block"
					>测评、咨询、观看和报名记录会在联网时同步到平台。你可以随时清除本机与云端记录。</text
				><button class="ui-reset button outline mt" @click="clearData">
					清除本机与云端记录
				</button></template
			>
			<template v-if="booking"
				><view class="sheet-heading"
					><text>咨询预约</text
					><button
						class="ui-reset icon-button"
						aria-label="关闭"
						@click="close"
					>
						<UiIcon name="x" /></button></view
				><text class="subtitle block">{{ booking.title }}</text
				><text class="muted block mt"
					>{{ booking.date }} {{ booking.time }} ·
					{{ booking.method }}</text
				><text
					class="badge mt"
					:class="{
						peach: booking.status === '待确认',
						neutral: booking.status === '已取消',
					}"
					>{{ booking.status }}</text
				><button class="ui-reset button mt" @click="contactCustomer">
					联系客服</button
				><button
					v-if="booking.status === '待确认'"
					class="ui-reset button outline mt-sm"
					@click="cancelBooking"
				>
					取消预约
				</button></template
			>
		</view></view
	>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { state, allCourses, persist } from "../services/store.js";
import { go, explain, toast } from "../services/navigation.js";
import { contactCustomer } from "../services/customer.js";
import { useSheet } from "../services/useSheet.js";
import {
	clearRemoteRecords,
	queueRecord,
	recordPayload,
	signOutAccount,
	syncProfile,
} from "../services/sync.js";
const props = defineProps({
	mode: String,
	params: { type: Object, default: () => ({}) },
});
const adminUrl = import.meta.env.VITE_ADMIN_URL || "http://localhost";
const filter = ref("全部"),
	settings = ref(false),
	privacy = ref(false),
	booking = ref(null),
	loggingOut = ref(false),
	nickname = ref(state.profile.name);
const maskedPhone = computed(() => state.account?.phone
	? `${state.account.phone.slice(0, 3)}****${state.account.phone.slice(-4)}` : "");
useSheet(
	computed(() => !!(settings.value || privacy.value || booking.value)),
	close,
);
const emptyAction = computed(
	() =>
		({
			咨询: { route: "booking", label: "预约一次咨询" },
			课程: { route: "courses", label: "去看看免费课程" },
			活动: { route: "activities", label: "发现公益活动" },
		})[filter.value] || { route: "home", label: "开始了解自己" },
);
watch(
	() => props.params.filter,
	(v) => {
		let value = v || "全部";
		for (let i = 0; i < 2; i++) {
			try {
				const decoded = decodeURIComponent(value);
				if (decoded === value) break;
				value = decoded;
			} catch { break; }
		}
		filter.value = value;
	},
	{ immediate: true },
);
const stats = computed(() => [
	{ label: "测评", value: state.reports.length },
	{ label: "咨询", value: state.bookings.length },
	{ label: "课程", value: Object.keys(state.progress).length },
	{ label: "活动", value: state.enrollments.length },
]);
const menus = computed(() => [
	{
		label: "测评记录与结果",
		filter: "测评",
		icon: "clipboard-text",
		count: state.reports.length,
	},
	{
		label: "咨询记录",
		filter: "咨询",
		icon: "chats-circle",
		count: state.bookings.length,
	},
	{
		label: "已看课程",
		filter: "课程",
		icon: "play-circle",
		count: Object.keys(state.progress).length,
	},
	{
		label: "我的活动",
		filter: "活动",
		icon: "plant",
		count: state.enrollments.length,
	},
]);
const records = computed(() =>
	[
		...state.reports.map((r) => ({
			...r,
			type: "测评",
			typeLabel: "测评记录",
			icon: "file-text",
			status: "已完成",
			action: "查看报告",
			sortDate: r.date,
		})),
		...state.bookings.map((r) => ({
			...r,
			type: "咨询",
			typeLabel: "咨询预约",
			icon: "chats-circle",
			action: "查看预约",
			sortDate: r.createdAt || r.date,
			date: r.date + " " + r.time,
		})),
		...Object.entries(state.progress).map(([courseId, p]) => ({
			id: "course-" + courseId,
			courseId,
			type: "课程",
			typeLabel: "已看课程",
			title: allCourses().find((c) => c.id === courseId)?.title || "课程",
			icon: "play-circle",
			status: p.percent === 100 ? "已看完" : "学习中",
			date: `${p.date || ""} · 已观看 ${p.percent}%`,
			percent: p.percent,
			action: p.percent === 100 ? "再次观看" : "继续观看",
			sortDate: p.date,
		})),
		...state.enrollments.map((r) => ({
			...r,
			type: "活动",
			typeLabel: "活动报名",
			icon: "leaf",
			action: "查看详情",
			sortDate: r.createdAt || r.date,
			date: r.date + " " + r.time,
		})),
	]
		.filter((r) => filter.value === "全部" || r.type === filter.value)
		.sort((a, b) => (b.sortDate || "").localeCompare(a.sortDate || "")),
);
function openSettings() {
	nickname.value = state.profile.name;
	settings.value = true;
}
function openAdminConsole() {
	settings.value = false;
	// #ifdef H5
	window.open(adminUrl, "_blank", "noopener,noreferrer");
	// #endif
	// #ifndef H5
	uni.setClipboardData({
		data: adminUrl,
		success: () => toast("后台地址已复制，请在浏览器打开"),
	});
	// #endif
}
function openRecord(r) {
	if (r.type === "测评") go("report", { record: r.id });
	else if (r.type === "课程") go("lesson", { id: r.courseId });
	else if (r.type === "活动") go("success", { record: r.id, id: r.eventId });
	else booking.value = state.bookings.find((b) => b.id === r.id);
}
function close() {
	settings.value = false;
	privacy.value = false;
	booking.value = null;
}
async function saveName() {
	if (!nickname.value.trim()) return toast("请填写昵称");
	const previous = state.profile.name;
	state.profile.name = nickname.value.trim();
	persist();
	const saved = await syncProfile();
	if (!saved && state.account) {
		state.profile.name = previous;
		persist();
		return toast("保存失败，请联网重试");
	}
	close();
	toast("昵称已保存");
}
function confirmLogout() {
	uni.showModal({
		title: "退出登录",
		content: "退出后，此设备不再显示账号记录；重新登录仍可找回。",
		confirmColor: "#657c70",
		success: async (result) => {
			if (!result.confirm || loggingOut.value) return;
			loggingOut.value = true;
			try {
				await signOutAccount();
				close();
				toast("已退出登录");
			} catch (error) {
				toast(error.message || "退出失败，请联网重试");
			} finally {
				loggingOut.value = false;
			}
		},
	});
}
function about() {
	explain(
		"关于平台",
		"免费公益心理服务：心理测评、心理咨询、心理课堂与公益活动。愿每一个感受，都被温柔看见。",
	);
}
function clearData() {
	uni.showModal({
		title: "清除本机与云端记录",
		content: "将清除本机与平台上的测评、预约、观看和报名记录，此操作无法撤销。",
		confirmText: "确认清除",
		confirmColor: "#9a6f57",
		success: (r) => {
			if (r.confirm) {
				state.reports = [];
				state.bookings = [];
				state.progress = {};
				state.enrollments = [];
				state.drafts = {};
				state.messages = [];
				persist();
				clearRemoteRecords();
				close();
				toast("记录清除请求已提交");
			}
		},
	});
}
function cancelBooking() {
	uni.showModal({
		title: "取消预约",
		content: "确定取消这次咨询预约吗？",
		confirmColor: "#657c70",
		success: (r) => {
			if (r.confirm) {
				booking.value.status = "已取消";
				queueRecord(
					recordPayload("consultation", booking.value, {
						status: "canceled",
					}),
				);
				persist();
				close();
				toast("预约已取消");
			}
		},
	});
}
</script>
<style scoped>
.auth-prompt { margin: 8rpx 0 25rpx; padding: 26rpx; border-radius: 22rpx; background: var(--pale); }
.auth-prompt .button { max-width: 300rpx; margin-left: 0; }
.profile-top {
	position: relative;
	padding: 30rpx 36rpx 38rpx;
	overflow: hidden;
	min-height: 224rpx;
}
.profile-art {
	position: absolute;
	right: 0;
	top: 0;
	width: 235rpx;
	opacity: 0.58;
	-webkit-mask-image: linear-gradient(to right, transparent, #000 40%);
	mask-image: linear-gradient(to right, transparent, #000 40%);
}
.profile-identity {
	position: relative;
}
.avatar {
	width: 150rpx;
	border-radius: 50%;
	overflow: hidden;
	border: 6rpx solid #ffffffb0;
	flex-shrink: 0;
}
.profile-identity .title {
	font-size: 38rpx;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.profile-copy {
	padding-right: 10rpx;
}
.profile-copy .small {
	color: var(--muted-strong);
	font-size: 24rpx;
}
.stats {
	display: flex;
	padding: 23rpx 0;
}
.stats button {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--muted);
	font-size: 24rpx;
	line-height: 1.5;
}
.stats button + button {
	border-left: 1px solid var(--line);
}
.stat-number {
	font-size: 39rpx;
	color: var(--ink);
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}
.health-card {
	margin-top: 23rpx;
	background: #e6eee3;
	border-radius: 20rpx;
	padding: 23rpx 21rpx;
	display: flex;
	align-items: center;
	gap: 19rpx;
	width: 100%;
	text-align: left;
}
.health-card .body-title {
	font-size: 27rpx;
}
.health-card .badge {
	font-size: 22rpx;
	padding: 7rpx 20rpx;
}
.health-card .tiny {
	font-size: 23rpx;
}
.list-row {
	padding: 24rpx 0;
	font-size: 28rpx;
}
.record-filters {
	gap: 16rpx;
}
.record-filters .chip {
	padding-left: 22rpx;
	padding-right: 22rpx;
}
.record-card {
	display: flex;
	align-items: flex-start;
	gap: 21rpx;
	padding: 23rpx;
}
.record-card .round-icon {
	width: 84rpx;
	height: 84rpx;
}
.record-card .body-title {
	font-size: 29rpx;
}
.record-action {
	display: flex;
	justify-content: flex-end;
	margin-top: 17rpx;
}
.record-card .progress-track {
	max-width: 270rpx;
}
.record-card .between {
	gap: 12rpx;
}
.records-heading {
	margin-top: 6rpx;
}
.empty-action {
	max-width: 340rpx;
	margin-left: auto;
	margin-right: auto;
}
.stats .ui-reset:active {
	background: var(--pale);
}
</style>
