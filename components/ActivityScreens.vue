<template>
	<AppShell v-if="mode === 'home'" title="公益活动" tab="activities">
		<view class="activity-city pad"
			><button
				class="ui-reset badge neutral"
				@click="
					explain(
						'同城公益活动',
						'这里展示平台发布的公益活动，具体集合地点请查看活动详情。',
					)
				"
			>
				<UiIcon name="map-pin" :size="24" />同城
			</button></view
		>
		<Artwork name="activityHero" alt="走到户外，让心慢下来" />
		<view class="pad"
			><view class="chip-row"
				><button
					v-for="item in ['全部', '报名中', '进行中', '已结束']"
					:key="item"
					class="ui-reset chip"
					:class="{ active: filter === item }"
					@click="filter = item"
				>
					{{ item }}
				</button></view
			>
			<view class="stack"
				><button
					v-for="(event, i) in visibleEvents"
					:key="event.id"
					class="ui-reset card event-card"
					:class="{ 'small-event': i > 0 }"
					@click="go('activity', { id: event.id })"
				>
					<view class="event-image"
						><Artwork
							:name="event.art"
							:aspect="i ? 0.8 : 2.2"
						/><text
							v-if="i === 0"
							class="badge solid image-badge"
							>{{ event.status }}</text
						></view
					><view class="event-info"
						><text class="body-title block">{{ event.title }}</text
						><view class="row gap-sm small muted mt-xs"
							><UiIcon name="calendar-blank" :size="30" /><text
								>{{ shortDate(event.date) }}
								{{ event.time.split("–")[0] }}</text
							></view
						><view class="row gap-sm small muted mt-xs"
							><UiIcon name="map-pin" :size="30" /><text>{{
								event.location.split("·")[0]
							}}</text></view
						><view class="between mt-sm"
							><view class="row gap-sm small muted"
								><UiIcon name="users" :size="31" /><text
									>{{ enrolled(event) }}/{{
										event.capacity
									}}人</text
								></view
							><text class="badge">免费参加</text></view
						></view
					>
				</button></view
			>
			<view v-if="!visibleEvents.length" class="empty"
				><UiIcon name="calendar-blank" :size="68" tone="muted" /><text
					class="block mt"
					>暂时没有{{ filter }}的活动</text
				><button
					class="ui-reset text-action mt-sm"
					@click="filter = '全部'"
				>
					查看全部活动
				</button></view
			>
		</view>
	</AppShell>
	<AppShell v-else-if="mode === 'detail'" title="活动详情" back>
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="分享活动"
				@click="share"
			>
				<UiIcon name="upload-simple" /></button
		></template>
		<Artwork :name="event.hero || 'forest'" :alt="event.title" />
		<view class="pad"
			><text class="title block mt-sm">{{ event.title }}</text
			><view class="row gap-sm mt-sm"
				><text class="badge peach">公益活动</text
				><text class="badge">免费参加</text
				><text class="badge solid">{{ event.status }}</text></view
			>
			<view class="event-meta"
				><view class="row gap"
					><UiIcon name="calendar-blank" :size="35" /><text
						>{{
							event.date.replace("-", "年").replace("-", "月")
						}}日 {{ event.time }}</text
					></view
				><view class="row gap"
					><UiIcon name="map-pin" :size="35" /><text>{{
						event.location
					}}</text></view
				><view class="row gap"
					><UiIcon name="user" :size="35" /><text
						>已报名{{ enrolled(event) }}人 / 限{{
							event.capacity
						}}人</text
					></view
				></view
			>
			<SectionHeading title="活动介绍" icon="leaf" /><text
				class="small muted block indented"
				>{{ event.intro }}</text
			>
			<SectionHeading title="活动安排" icon="calendar-check" /><view
				class="timeline"
				><view
					v-for="item in event.schedule"
					:key="item[0]"
					class="timeline-row"
					><view class="timeline-dot" /><text class="timeline-time">{{
						item[0]
					}}</text
					><view
						><text class="body-title block">{{ item[1] }}</text
						><text class="small muted">{{ item[2] }}</text></view
					></view
				></view
			>
			<SectionHeading title="注意事项" icon="info" /><text
				class="small muted block indented"
				>请穿舒适运动鞋，自备饮用水。</text
			>
		</view>
		<template #footer
			><button
				class="ui-reset button"
				:disabled="
					event.status !== '报名中' ||
					enrolled(event) >= event.capacity
				"
				@click="go('signup', { id: event.id })"
			>
				{{
					enrolled(event) >= event.capacity
						? "名额已满"
						: event.status === "报名中"
							? "立即报名"
							: "暂未开放报名"
				}}
			</button></template
		>
	</AppShell>
	<AppShell v-else-if="mode === 'signup'" title="活动报名" back>
		<view class="pad"
			><view class="card event-summary"
				><view class="summary-thumb"
					><Artwork
						:name="event.hero || 'forest'"
						:aspect="1" /></view
				><view class="grow"
					><text class="body-title block">{{ event.title }}</text
					><view class="row gap-sm small muted mt-xs"
						><UiIcon name="calendar-blank" :size="27" /><text
							>{{ shortDate(event.date) }} {{ event.time }}</text
						></view
					><view class="row gap-sm small muted mt-xs"
						><UiIcon name="map-pin" :size="27" /><text>{{
							event.location
						}}</text></view
					></view
				></view
			>
			<SectionHeading title="填写报名信息" />
			<view class="form-field"
				><text class="form-label"
					>姓名<text class="required">*</text></text
				><input
					class="input"
					v-model="form.name"
					placeholder="请输入姓名"
					maxlength="20"
					aria-label="姓名"
			/></view>
			<view class="form-field"
				><text class="form-label"
					>联系手机<text class="required">*</text></text
				><input
					class="input"
					v-model="form.phone"
					placeholder="请输入手机号"
					type="number"
					maxlength="11"
					aria-label="联系手机"
			/></view>
			<view class="form-field"
				><text class="form-label"
					>参加人数<text class="required">*</text></text
				><view class="stepper"
					><button
						class="ui-reset"
						aria-label="减少人数"
						:disabled="form.count <= 1"
						@click="form.count--"
					>
						<UiIcon name="minus" :size="30" /></button
					><text>{{ form.count }}</text
					><button
						class="ui-reset"
						aria-label="增加人数"
						:disabled="
							form.count >= event.capacity - enrolled(event)
						"
						@click="form.count++"
					>
						<UiIcon name="plus" :size="30" /></button></view
			></view>
			<view class="form-field"
				><text class="form-label"
					>紧急联系人<text class="required">*</text></text
				><input
					class="input"
					v-model="form.emergency"
					placeholder="姓名与手机号"
					maxlength="40"
					aria-label="紧急联系人"
			/></view>
			<view class="form-field align-top"
				><text class="form-label"
					>备注<text class="tiny muted">（选填）</text></text
				><textarea
					class="textarea grow"
					v-model="form.note"
					placeholder="如有特殊需求，请告诉我们"
					maxlength="300"
					aria-label="备注"
				/>
			</view>
			<view class="soft-card signup-notice row gap"
				><UiIcon name="leaf" tone="primary" :size="60" /><view
					><text class="body-title block">活动免费，请按时参加</text
					><text class="tiny muted"
						>名额有限，提交后我们会为您保留名额。</text
					></view
				></view
			>
			<view class="check-row" @click="form.consent = !form.consent"
				><view class="check-box" :class="{ checked: form.consent }"
					><UiIcon
						v-if="form.consent"
						name="check"
						tone="white"
						:size="25" /></view
				><text
					>我已阅读<text class="link" @click.stop="privacy"
						>活动须知与隐私说明</text
					></text
				></view
			>
			<text v-if="error" class="error-text block">{{ error }}</text>
		</view>
		<template #footer
			><button
				class="ui-reset button"
				:disabled="submitting"
				@click="submit"
			>
				{{ submitting ? "正在保存…" : "提交报名" }}
			</button></template
		>
	</AppShell>
	<AppShell v-else title="报名结果" back>
		<view class="pad success-page"
			><view class="success-icon"
				><UiIcon name="check-circle" tone="primary" :size="230" /></view
			><text class="success-title serif">报名成功</text
			><text class="muted block small mt-xs"
				>期待与你一起，感受自然的力量。</text
			>
			<view class="card event-summary success-card"
				><view class="summary-thumb"
					><Artwork
						:name="event.hero || 'forest'"
						:aspect="1" /></view
				><view class="grow"
					><text class="body-title block">{{ event.title }}</text
					><view class="row gap-sm tiny muted mt-xs"
						><UiIcon name="calendar-blank" :size="26" /><text
							>{{ shortDate(event.date) }} {{ event.time }}</text
						></view
					><view class="row gap-sm tiny muted mt-xs"
						><UiIcon name="map-pin" :size="26" /><text>{{
							event.location
						}}</text></view
					><text class="tiny muted block mt-xs"
						>报名编号 {{ enrollment.code }}</text
					></view
				></view
			>
			<view class="checkin-code"
				><QrCode :value="'mindcare:signup:' + enrollment.code" /><text
					class="tiny muted"
					>现场出示签到码</text
				></view
			>
			<view class="notice"
				><UiIcon name="bell" tone="peach" :size="34" /><text
					>请提前10分钟到达集合地点。</text
				></view
			><button
				class="ui-reset button mt"
				@click="go('records', { filter: '活动' })"
			>
				查看我的活动</button
			><button
				class="ui-reset button outline mt-sm"
				@click="go('activities', {}, true)"
			>
				返回活动首页
			</button>
			<view class="success-leaves"><Artwork name="leaves" /></view>
		</view>
	</AppShell>
</template>
<script setup>
import { computed, reactive, ref, watch } from "vue";
import QrCode from "./QrCode.vue";
import { state, allActivities, persist, id, now } from "../services/store.js";
import { validateEnrollment } from "../services/domain.js";
import { go, explain, toast } from "../services/navigation.js";
import { queueRecord, recordPayload } from "../services/sync.js";
const props = defineProps({
	mode: String,
	params: { type: Object, default: () => ({}) },
});
const filter = ref("报名中"),
	error = ref(""),
	submitting = ref(false);
const visibleEvents = computed(() =>
	allActivities().filter(
		(e) => filter.value === "全部" || e.status === filter.value,
	),
);
const enrollment = computed(
	() =>
		state.enrollments.find((e) => e.id === props.params.record) ||
		state.enrollments[0] || {
			code: "待完成报名",
			eventId: props.params.id || "forest",
		},
);
const event = computed(
	() =>
		allActivities().find(
			(e) => e.id === (props.params.id || enrollment.value.eventId),
		) || allActivities()[0],
);
const enrolled = (e) =>
	e.enrolled +
	state.enrollments
		.filter((r) => r.eventId === e.id && !r.demo && r.status !== "已取消")
		.reduce((n, r) => n + r.count, 0);
const shortDate = (d) => {
	const a = d.split("-");
	return `${Number(a[1])}月${Number(a[2])}日`;
};
const form = reactive({
	name: "",
	phone: "",
	count: 1,
	emergency: "",
	note: "",
	consent: true,
});
watch(form, () => {
	error.value = "";
});
function privacy() {
	explain(
		"活动须知与隐私说明",
		"请确认身体状态适合参加活动，按时到达集合地点。联系信息仅用于活动通知与紧急联络。本体验版本保存在当前设备。",
	);
}
function share() {
	uni.setClipboardData({
		data: `${event.value.title}\n${event.value.date} ${event.value.time}\n${event.value.location}\n免费参加`,
		success: () => toast("活动信息已复制"),
	});
}
function submit() {
	error.value = validateEnrollment(form, event.value, state.enrollments);
	if (error.value) return;
	submitting.value = true;
	const record = {
		...form,
		id: id("signup"),
		eventId: event.value.id,
		title: event.value.title,
		date: event.value.date,
		time: event.value.time,
		location: event.value.location,
		createdAt: now(),
		code: "GY" + Date.now().toString().slice(-10),
		status: "报名成功",
	};
	state.enrollments.unshift(record);
	queueRecord(
		recordPayload("activity", record, {
			contentKey: event.value.id,
			title: event.value.title,
		}),
	);
	if (persist())
		uni.redirectTo({
			url: `/pages/activities/success?record=${record.id}&id=${event.value.id}`,
		});
	submitting.value = false;
}
</script>
<style scoped>
.activity-city {
	display: flex;
	justify-content: flex-end;
	height: 38rpx;
	align-items: center;
	padding-bottom: 10rpx;
}
.event-card {
	text-align: left;
	width: 100%;
}
.event-image {
	position: relative;
}
.image-badge {
	position: absolute;
	top: 14rpx;
	left: 14rpx;
}
.event-info {
	padding: 22rpx;
}
.event-info .body-title {
	font-size: 30rpx;
}
.small-event {
	display: flex;
	align-items: center;
	padding: 16rpx;
}
.small-event .event-image {
	width: 190rpx;
	flex-shrink: 0;
	border-radius: 14rpx;
	overflow: hidden;
}
.small-event .event-info {
	flex: 1;
	padding: 0 0 0 20rpx;
}
.small-event .body-title {
	font-size: 27rpx;
}
.small-event .small {
	font-size: 23rpx;
}
.event-meta {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
	margin-top: 32rpx;
	font-size: 25rpx;
	color: var(--muted);
}
.indented {
	padding-left: 48rpx;
}
.timeline {
	padding-left: 18rpx;
}
.timeline-row {
	display: flex;
	position: relative;
	gap: 22rpx;
	padding-bottom: 22rpx;
	margin-left: 0;
}
.timeline-row:before {
	content: "";
	position: absolute;
	left: 6rpx;
	top: 13rpx;
	bottom: -12rpx;
	width: 1px;
	background: #b0c2a9;
}
.timeline-row:last-child:before {
	display: none;
}
.timeline-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: #829981;
	position: relative;
	margin-top: 14rpx;
	flex-shrink: 0;
}
.timeline-time {
	font-size: 24rpx;
	color: var(--muted);
	margin-top: 4rpx;
}
.timeline .body-title {
	font-size: 27rpx;
}
.event-summary {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 22rpx;
	margin-top: 18rpx;
}
.summary-thumb {
	width: 172rpx;
	flex-shrink: 0;
	border-radius: 14rpx;
	overflow: hidden;
}
.event-summary .body-title {
	font-size: 27rpx;
}
.event-summary .small {
	font-size: 23rpx;
}
.form-field {
	margin-top: 29rpx;
	margin-bottom: 29rpx;
}
.form-label {
	width: 181rpx;
	font-size: 25rpx;
}
.stepper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex: 1;
	background: #f2f5f0;
	border-radius: 14rpx;
	min-height: 78rpx;
}
.stepper button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	min-height: 78rpx;
}
.align-top {
	align-items: flex-start;
}
.align-top .form-label {
	padding-top: 17rpx;
}
.signup-notice {
	margin-top: 56rpx;
}
.signup-notice .body-title {
	font-size: 27rpx;
}
.success-page {
	text-align: center;
	padding-top: 38rpx;
}
.success-icon {
	margin: 6rpx auto 0;
}
.success-title {
	font-size: 58rpx;
	font-weight: 600;
	display: block;
	letter-spacing: 4rpx;
	margin-top: 12rpx;
}
.success-card {
	margin-top: 42rpx;
	text-align: left;
}
.checkin-code {
	padding: 34rpx 10rpx;
}
.checkin-number {
	font-size: 34rpx;
	letter-spacing: 3rpx;
	color: var(--primary-dark);
	font-weight: 600;
	margin-top: 8rpx;
}
.success-leaves {
	margin-top: 25rpx;
	opacity: 0.8;
}
</style>
