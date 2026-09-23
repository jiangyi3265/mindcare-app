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
			<view class="card support-card"
				><view class="wechat-icon"
					><UiIcon
						name="wechat-logo"
						tone="primary"
						:size="82" /></view
				><view class="grow"
					><text class="body-title block">微信官方客服</text
					><text class="tiny muted block"
						>在线沟通 · 咨询服务与预约帮助</text
					><button
						class="ui-reset button compact mt-xs"
						@click="contactCustomer"
					>
						联系客服</button
					><text class="tiny muted block center mt-xs"
						>将打开微信客服会话</text
					></view
				></view
			>
			<view class="card booking-card mt-sm"
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
	<AppShell v-else title="预约咨询" back>
		<view class="pad booking-form">
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
			<SectionHeading title="选择日期" /><view class="dates"
				><button
					v-for="day in dates"
					:key="day.value"
					class="ui-reset date"
					:class="{ selected: form.date === day.value }"
					@click="form.date = day.value"
				>
					<text>{{ day.label }}</text
					><text class="tiny">{{ day.week }}</text>
				</button></view
			>
			<SectionHeading title="选择时间" /><view class="times"
				><button
					class="ui-reset"
					v-for="time in ['10:00', '14:00', '16:00']"
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
import { ref, reactive, watch } from "vue";
import { state, persist, id, now } from "../services/store.js";
import { validateContact } from "../services/domain.js";
import { go, explain } from "../services/navigation.js";
import { contactCustomer } from "../services/customer.js";
import { queueRecord, recordPayload } from "../services/sync.js";
defineProps({ mode: String, params: Object });
const expanded = ref(-1),
	error = ref(""),
	submitting = ref(false);
const faqs = [
	{
		title: "如何选择适合自己的咨询方式？",
		content:
			"你可以选择视频、电话或线下咨询。若不确定，先联系客服沟通你的需求。",
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
const dates = Array.from({ length: 5 }, (_, i) => {
	const d = new Date();
	d.setDate(d.getDate() + i + 1);
	return {
		value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
		label: `${d.getMonth() + 1}月${d.getDate()}日`,
		week: "周" + ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
	};
});
const topics = ["情绪与压力", "睡眠困扰", "人际关系", "亲子沟通", "其他"];
const form = reactive({
	method: "视频咨询",
	date: dates[0].value,
	time: "14:00",
	name: "",
	phone: "",
	topic: topics[0],
	message: "",
	consent: true,
});
watch(form, () => {
	error.value = "";
});
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
		id: id("booking"),
		title: form.topic + "咨询",
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
.support-card {
	display: flex;
	gap: 18rpx;
	padding: 22rpx;
}
.wechat-icon {
	width: 128rpx;
	height: 128rpx;
	background: #e9f0e7;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
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
	flex: 1;
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
