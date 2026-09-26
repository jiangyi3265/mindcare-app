<template>
	<AppShell v-if="mode === 'home'" title="心理咨询" tab="consultation">
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="咨询记录"
				@click="go('records', { filter: '咨询' })"
			>
				<UiIcon name="bell" /></button
		></template>
		<Artwork name="counseling" alt="有人倾听，也是一种力量" />
		<view class="pad consultation-body">
			<view class="card booking-card"
				><view class="booking-art"><Artwork name="chair" /></view
				><view class="grow"
					><text class="body-title">预约咨询</text
					><text class="small muted block"
						>与专业心理咨询师对话<br />获得支持与陪伴</text
					><button
						class="ui-reset button compact mt-sm"
						@click="go('booking')"
					>
						立即预约
					</button></view
				></view
			>
			<SectionHeading title="咨询专家" action="预约" @action="go('booking')" />
			<view class="expert-list">
				<button v-for="expert in experts" :key="expert.id" class="ui-reset card expert-card" type="button" :aria-label="`查看${expert.name || expert.title}的可预约时间`" @click="go('expert', { id: expert.id })">
					<Artwork v-if="expert.photo === 'builtin:avatar'" name="avatar" :alt="expert.name || expert.title" :aspect="1" />
					<image v-else :src="expertImageUrl(expert.photo)" class="expert-photo" mode="aspectFill" :alt="expert.name || expert.title" />
					<view class="expert-copy"><text class="body-title block">{{ expert.name || expert.title }}</text><text class="tiny muted block mt-xs">{{ expert.credentials }}</text><text class="small muted block mt-xs">{{ expert.profile }}</text><view class="expert-tags"><text v-for="method in (expert.methods || []).slice(0, 3)" :key="method" class="badge neutral">{{ method }}</text></view><text class="tiny expert-cta block mt-sm">查看详情 · 选择预约时段</text></view>
					<UiIcon name="caret-right" :size="25" />
				</button>
			</view>
			<SectionHeading title="服务流程" />
			<view class="steps"
				><view
					v-for="(step, i) in ['提交预约', '客服确认', '开始咨询']"
					:key="step"
					class="step"
					><view class="step-number">{{ i + 1 }}</view
					><text>{{ step }}</text></view
				></view
			>
			<SectionHeading title="常见问题" />
			<view v-for="(faq, i) in faqs" :key="faq.title"
				><button
					class="ui-reset faq"
					@click="expanded = expanded === i ? -1 : i"
				>
					<text>{{ faq.title }}</text
					><UiIcon
						:name="expanded === i ? 'caret-down' : 'caret-right'"
						:size="27"
					/></button
				><view v-if="expanded === i" class="faq-answer">{{
					faq.content
				}}</view></view
			>
			<view class="free-note row gap-sm"
				><UiIcon name="heart" tone="primary" :size="29" /><text
					>免费公益服务</text
				></view
			>
		</view>
	</AppShell>
	<AppShell v-else-if="mode === 'expert'" title="专家详情" back>
		<view v-if="selectedExpert" class="pad expert-detail">
			<view class="card expert-profile-card">
				<Artwork v-if="selectedExpert.photo === 'builtin:avatar'" name="avatar" :alt="selectedExpert.name || selectedExpert.title" :aspect="1" />
				<image v-else :src="expertImageUrl(selectedExpert.photo)" class="expert-detail-photo" mode="aspectFill" :alt="selectedExpert.name || selectedExpert.title" />
				<view class="expert-detail-copy"><text class="title block">{{ selectedExpert.name || selectedExpert.title }}</text><text class="small muted block mt-xs">{{ selectedExpert.credentials }}</text><text class="body block mt-sm">{{ selectedExpert.profile }}</text><view class="expert-tags"><text v-for="method in (selectedExpert.methods || []).slice(0, 6)" :key="method" class="badge neutral">{{ method }}</text></view></view>
			</view>
			<SectionHeading title="可预约时间" icon="calendar-check" />
			<text class="small muted block availability-note">已开放未来两个月的预约，选择日期和时段后即可提交预约。</text>
			<view class="availability-preview">
				<view v-for="day in previewDates" :key="day.value" class="availability-day"><view class="between"><text class="body-title">{{ day.label }}</text><text class="tiny muted">{{ day.week }}</text></view><view class="availability-times"><button v-for="time in timesFor(selectedExpert)" :key="time" class="ui-reset slot-button" type="button" @click="bookSlot(day.value, time)">{{ time }}</button></view></view>
			</view>
			<button class="ui-reset button" type="button" @click="go('booking', { expert: selectedExpert.id })">查看全部两个月并预约</button>
		</view>
	</AppShell>
	<AppShell v-else title="预约咨询" back>
		<view class="pad booking-form">
			<SectionHeading title="选择专家" /><scroll-view scroll-x class="expert-picker-scroll"><view class="expert-picker"><button v-for="expert in experts" :key="expert.id" class="ui-reset expert-option" type="button" :class="{ selected: form.expertId === expert.id }" @click="form.expertId = expert.id"><text class="body-title block">{{ expert.name || expert.title }}</text><text class="tiny muted block mt-xs">{{ expert.credentials }}</text></button></view></scroll-view>
			<text class="tiny muted block availability-note">可预约日期：{{ bookingRangeLabel }}，左右滑动查看更多日期。</text>
			<SectionHeading title="咨询方式" /><view class="methods"
				><button
					v-for="method in methods"
					:key="method.label"
					class="ui-reset method"
					:class="{ selected: form.method === method.label }"
					@click="form.method = method.label"
				>
					<UiIcon
						:name="method.icon"
						:tone="form.method === method.label ? 'white' : 'ink'"
						:size="38"
					/><text>{{ method.label }}</text>
				</button></view
			>
			<SectionHeading title="选择日期" /><scroll-view scroll-x class="dates-scroll"
				><view class="dates"
				><button
					v-for="day in dates"
					:key="day.value"
					class="ui-reset date"
					:class="{ selected: form.date === day.value }"
					@click="form.date = day.value"
				>
					<text>{{ day.label }}</text
					><text class="tiny">{{ day.week }}</text>
				</button></view></scroll-view
			>
			<SectionHeading title="选择时间" /><view class="times"
				><button
					class="ui-reset"
					v-for="time in activeTimes"
					:key="time"
					:class="{ selected: form.time === time }"
					@click="form.time = time"
				>
					{{ time }}
				</button></view
			>
			<SectionHeading title="个人信息" />
			<view class="form-field"
				><text class="form-label">称呼</text
				><input
					class="input"
					v-model="form.name"
					placeholder="请输入你的称呼"
					maxlength="20"
					aria-label="称呼"
			/></view>
			<view class="form-field"
				><text class="form-label">联系手机</text
				><input
					class="input"
					v-model="form.phone"
					placeholder="请输入手机号"
					type="number"
					maxlength="11"
					aria-label="联系手机"
			/></view>
			<view class="form-field"
				><text class="form-label">咨询主题</text
				><picker
					class="picker-wrap"
					:range="topics"
					@change="form.topic = topics[$event.detail.value]"
					><view class="picker-input"
						>{{ form.topic
						}}<UiIcon name="caret-down" :size="23" /></view></picker
			></view>
			<view class="form-field align-top"
				><text class="form-label"
					>留言<text class="tiny muted">（选填）</text></text
				><textarea
					class="textarea grow"
					v-model="form.message"
					maxlength="500"
					placeholder="简单说说你希望获得的帮助"
					aria-label="咨询留言"
				/>
			</view>
			<view class="check-row" @click="form.consent = !form.consent"
				><view class="check-box" :class="{ checked: form.consent }"
					><UiIcon
						v-if="form.consent"
						name="check"
						tone="white"
						:size="25" /></view
				><text
					>我同意<text class="link" @click.stop="privacy"
						>隐私保护说明</text
					></text
				></view
			>
			<text v-if="error" class="error-text block">{{ error }}</text
			><text class="tiny muted center block"
				>提交后由客服确认预约时间</text
			>
		</view>
		<template #footer
			><button
				class="ui-reset button"
				:disabled="submitting"
				@click="submit"
			>
				{{ submitting ? "正在保存…" : "提交预约" }}
			</button></template
		>
	</AppShell>
</template>
<script setup>
import { ref, reactive, watch, computed } from "vue";
import { state, persist, id, now, allExperts } from "../services/store.js";
import { validateContact } from "../services/domain.js";
import { go, explain } from "../services/navigation.js";
import { queueRecord, recordPayload } from "../services/sync.js";
const props = defineProps({ mode: String, params: { type: Object, default: () => ({}) } });
const experts = computed(() => allExperts().filter((expert) => expert && expert.available !== false));
const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const expertImageUrl = (path) => `${apiBase}${path}`;
const defaultTimes = ["10:00", "14:00", "16:00"];
const makeBookingDates = (count = 62) => Array.from({ length: count }, (_, index) => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + index + 1);
	return {
		value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
		label: `${d.getMonth() + 1}月${d.getDate()}日`,
		week: "周" + ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
	};
});
const dates = makeBookingDates();
const selectedExpert = computed(() => experts.value.find((expert) => expert.id === props.params?.id) || experts.value[0]);
const timesFor = (expert) => Array.isArray(expert?.availableTimes) && expert.availableTimes.length ? expert.availableTimes : defaultTimes;
const previewDates = computed(() => dates.slice(0, 7));
const expanded = ref(-1),
	error = ref(""),
	submitting = ref(false);
const faqs = [
	{
		title: "如何选择适合自己的咨询方式？",
		content:
			"你可以选择视频、电话或线下咨询。若不确定，可在预约时留言说明需求。",
	},
	{
		title: "咨询需要准备什么？",
		content:
			"选择安静、私密的空间，提前想一想最近想讨论的感受即可，不需要准备标准答案。",
	},
];
const methods = [
	{ label: "视频咨询", icon: "video-camera" },
	{ label: "电话咨询", icon: "phone" },
	{ label: "线下咨询", icon: "map-pin" },
];
const topics = ["情绪与压力", "睡眠困扰", "人际关系", "亲子沟通", "其他"];
const form = reactive({
	expertId: props.params?.expert || experts.value[0]?.id || "",
	method: "视频咨询",
	date: props.params?.date && dates.some((day) => day.value === props.params.date) ? props.params.date : dates[0].value,
	time: props.params?.time || "14:00",
	name: "",
	phone: "",
	topic: topics[0],
	message: "",
	consent: true,
});
const selectedBookingExpert = computed(() => experts.value.find((expert) => expert.id === form.expertId) || experts.value[0]);
const activeTimes = computed(() => timesFor(selectedBookingExpert.value));
const bookingRangeLabel = computed(() => `${dates[0].label}至${dates[dates.length - 1].label}（共${dates.length}天）`);
watch(() => props.params, (params = {}) => {
	if (params.expert && experts.value.some((expert) => expert.id === params.expert)) form.expertId = params.expert;
	if (params.date && dates.some((day) => day.value === params.date)) form.date = params.date;
	if (params.time && activeTimes.value.includes(params.time)) form.time = params.time;
}, { deep: true, immediate: true });
watch(() => form.expertId, () => {
	if (!activeTimes.value.includes(form.time)) form.time = activeTimes.value[0];
});
watch(experts, (list) => {
	if (!form.expertId && list[0]) form.expertId = list[0].id;
}, { immediate: true });
watch(form, () => {
	error.value = "";
});
function bookSlot(date, time) {
	if (!selectedExpert.value) return;
	go("booking", { expert: selectedExpert.value.id, date, time });
}
const privacy = () =>
	explain(
		"隐私保护说明",
		"预约信息仅用于安排咨询服务，并会加密传输至平台后台。请勿填写不必要的敏感信息；你可以在我的隐私设置中清除记录。",
	);
function submit() {
	error.value = validateContact(form.name, form.phone, form.consent);
	if (error.value) return;
	if (
		state.bookings.some(
			(b) =>
				!b.demo &&
				b.status !== "已取消" &&
				b.phone === form.phone &&
				b.date === form.date &&
				b.time === form.time,
		)
	) {
		error.value = "你已预约该时段，请在咨询记录中查看";
		return;
	}
	submitting.value = true;
	const booking = {
		...form,
		expertName: selectedBookingExpert.value?.name || selectedBookingExpert.value?.title || "",
		id: id("booking"),
		title: `${selectedBookingExpert.value?.name || "专家"}${form.topic}咨询`,
		status: "待确认",
		createdAt: now(),
	};
	state.bookings.unshift(booking);
	queueRecord(recordPayload("consultation", booking));
	if (form.message.trim()) {
		const message = {
			id: id("msg"),
			name: form.name,
			text: form.message,
			date: now(),
			status: "待回复",
		};
		state.messages.unshift(message);
		queueRecord(recordPayload("message", message, { title: "咨询预约留言" }));
	}
	if (persist()) {
		uni.showToast({ title: "预约已保存", icon: "success" });
		go("records", { filter: "咨询" });
	}
	submitting.value = false;
}
</script>
<style scoped>
.consultation-body {
	margin-top: -23rpx;
	position: relative;
}
.booking-card {
	padding: 21rpx;
	display: flex;
	align-items: center;
	gap: 24rpx;
}
.booking-art {
	width: 204rpx;
	flex-shrink: 0;
	border-radius: 12rpx;
	overflow: hidden;
}
.expert-list { display: flex; flex-direction: column; gap: 18rpx; }
.expert-card { display: flex; gap: 20rpx; padding: 20rpx; align-items: flex-start; width: 100%; text-align: left; }
.expert-card > image, .expert-card > .artwork { width: 150rpx; height: 150rpx; padding-top: 0 !important; flex: 0 0 150rpx; border-radius: 24rpx; overflow: hidden; }
.expert-photo { object-fit: cover; }
.expert-copy { min-width: 0; flex: 1; }
.expert-cta { color: var(--primary); font-weight: 600; }
.expert-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 14rpx; }
.expert-profile-card { display: flex; gap: 24rpx; padding: 24rpx; align-items: flex-start; }
.expert-profile-card > image, .expert-profile-card > .artwork { width: 210rpx; height: 210rpx; padding-top: 0 !important; flex: 0 0 210rpx; border-radius: 28rpx; overflow: hidden; }
.expert-detail-photo { object-fit: cover; }
.expert-detail-copy { min-width: 0; flex: 1; }
.availability-note { margin: 8rpx 0 18rpx; }
.availability-preview { display: flex; flex-direction: column; gap: 14rpx; margin-bottom: 24rpx; }
.availability-day { padding: 18rpx; border-radius: 16rpx; background: #f1f4ef; }
.availability-times { display: flex; gap: 12rpx; margin-top: 14rpx; }
.slot-button { flex: 1; padding: 12rpx 8rpx; border-radius: 12rpx; background: white; color: var(--primary); font-size: 24rpx; }
.expert-picker-scroll, .dates-scroll { width: 100%; white-space: nowrap; }
.expert-picker, .dates { display: flex; gap: 14rpx; width: max-content; }
.expert-option { width: 240rpx; padding: 18rpx; border: 2rpx solid transparent; border-radius: 16rpx; background: #eef2ec; text-align: left; white-space: normal; }
.expert-option.selected { border-color: var(--primary); background: #e3ede2; }
.steps {
	display: flex;
	position: relative;
	margin: 0 28rpx;
}
.steps:before {
	content: "";
	position: absolute;
	left: 14%;
	right: 14%;
	top: 26rpx;
	border-top: 2px dotted #cbd6c8;
}
.step {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	font-size: 25rpx;
	color: var(--muted);
	z-index: 1;
}
.step-number {
	width: 50rpx;
	height: 50rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #e5eddf;
	color: #71836d;
}
.faq {
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid #e9ece6;
	padding: 20rpx 0;
	font-size: 25rpx;
	color: var(--muted);
	text-align: left;
}
.faq-answer {
	font-size: 25rpx;
	padding: 20rpx;
	background: #f0f4ec;
	border-radius: 12rpx;
	color: var(--muted);
}
.free-note {
	justify-content: center;
	margin-top: 24rpx;
	color: #6b876e;
	font-size: 24rpx;
}
.booking-form > .section-heading:first-child {
	margin-top: 16rpx;
}
.methods {
	display: flex;
	gap: 18rpx;
}
.method {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	border-radius: 14rpx;
	background: #f0f3ee;
	min-height: 136rpx;
	font-size: 25rpx;
}
.methods .selected,
.dates .selected,
.times .selected {
	background: var(--primary);
	color: white;
}
.dates {
	display: flex;
	gap: 12rpx;
}
.date {
	width: 112rpx;
	flex: 0 0 112rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 3rpx;
	padding: 19rpx 2rpx;
	background: #eef1ec;
	border-radius: 13rpx;
	color: var(--muted);
	font-size: 24rpx;
}
.times {
	display: flex;
	gap: 18rpx;
}
.times button {
	flex: 1;
	background: #eef1ec;
	border-radius: 12rpx;
	padding: 13rpx;
	font-size: 26rpx;
}
.booking-form .form-label {
	width: 148rpx;
}
.align-top {
	align-items: flex-start;
}
.align-top .form-label {
	padding-top: 17rpx;
}
</style>
<style scoped>
.times button {
	text-align: center;
}
</style>
