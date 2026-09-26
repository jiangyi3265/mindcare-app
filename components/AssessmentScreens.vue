<template>
	<AppShell v-if="mode === 'home'" title="心理测评" tab="assessment">
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="消息通知"
				@click="go('records')"
			>
				<UiIcon name="bell" /></button
		></template>
		<swiper v-if="banners.length" class="home-banner" :autoplay="banners.length > 1" :interval="4500" :duration="450" :circular="banners.length > 1" :indicator-dots="banners.length > 1" indicator-color="rgba(54,76,68,.35)" indicator-active-color="#597568" aria-label="首页轮播图">
			<swiper-item v-for="banner in banners" :key="banner.id">
				<Artwork v-if="banner.image.startsWith('builtin:')" :name="banner.image.slice(8)" :alt="banner.title" :aspect="2.106" />
				<image v-else class="banner-image" :src="bannerImageUrl(banner.image)" :alt="banner.title" mode="aspectFill" />
			</swiper-item>
		</swiper>
		<view class="pad home-main">
			<view class="search-box"
				><UiIcon
					name="magnifying-glass"
					:size="33"
					tone="muted" /><input
					v-model="search"
					placeholder="搜索心理测评"
					aria-label="搜索心理测评" /><button
					v-if="search"
					class="ui-reset search-clear"
					aria-label="清空搜索"
					@click="search = ''"
				>
					<UiIcon name="x" tone="muted" :size="25" /></button
			></view>
			<view class="chip-row"
				><button
					v-for="item in categories"
					:key="item"
					class="ui-reset chip"
					:class="{ active: category === item }"
					@click="category = item"
				>
					{{ item }}
				</button></view
			>
			<SectionHeading
				title="热门测评"
				action="更多"
				@action="showAll = !showAll"
			/>
			<view class="assessment-grid"
				><button
					v-for="item in visibleScales"
					:key="item.id"
					class="ui-reset card assessment-card"
					@click="go('assessment', { id: item.id })"
				>
					<Artwork
						:name="item.art"
						:alt="item.title"
						:aspect="1.43"
					/><view class="assessment-info"
						><text class="body-title block">{{ item.title }}</text
						><text class="small muted block mt-xs"
							>{{ item.count }}题 · 约{{ item.minutes }}分钟</text
						><view class="between mt-sm"
							><text class="badge solid">免费</text
							><UiIcon name="caret-right" :size="25" /></view
					></view></button
			></view>
			<view v-if="!visibleScales.length" class="empty"
				>没有找到相关测评，试试其他关键词</view
			>
			<SectionHeading
				title="最近测评"
				action="查看记录"
				@action="go('records', { filter: '测评' })"
			/>
			<button
				v-if="latest"
				class="ui-reset card recent-card"
				@click="go('report', { record: latest.id })"
			>
				<view class="thumb"><Artwork name="flowers" :aspect="1" /></view
				><view class="grow"
					><text class="body-title block">{{ latest.title }}</text
					><text class="small muted"
						>完成于
						{{
							latest.date.split(" ")[0].replaceAll("-", ".")
						}}</text
					></view
				><text class="badge">已完成</text
				><UiIcon name="caret-right" :size="22" />
			</button>
			<view v-else class="soft-card small muted"
				>从第一次测评开始，记录对自己的了解。</view
			>
		</view>
	</AppShell>

	<AppShell v-else-if="mode === 'detail'" title="测评详情" back>
		<Artwork :name="scale.hero" :alt="scale.title" />
		<view class="pad detail-body"
			><text class="title block">{{ scale.title }}</text
			><view class="row gap-sm mt-sm"
				><text class="badge solid">免费</text
				><text class="badge neutral">{{ scale.count }}题</text
				><text class="badge neutral"
					>约{{ scale.minutes }}分钟</text
				></view
			>
			<SectionHeading title="测评介绍" icon="shield-check" /><text
				class="muted description block"
				>{{ scale.description }}</text
			>
			<view v-if="scale.sourceName" class="source-note soft-card mt-sm">
				<text class="small block">量表来源：{{ scale.sourceName }}<text v-if="scale.version"> · {{ scale.version }}</text></text>
				<text v-if="scale.license" class="tiny muted block mt-xs">授权/使用说明：{{ scale.license }}</text>
				<text v-if="scale.sourceUrl" class="tiny muted block mt-xs">正式使用请以来源方授权版本和指导手册为准。</text>
			</view>
			<SectionHeading title="作答须知" icon="clock" /><view
				class="guidelines"
				><view
					v-for="line in [
						'请根据近两周的实际感受作答',
						'结果仅供自我了解，不作为临床诊断',
						'请在安静的环境中独立完成',
					]"
					:key="line"
					class="row gap-sm"
					><UiIcon
						name="check-circle"
						:size="31"
						tone="primary"
					/><text>{{ line }}</text></view
				></view
			>
			<text class="tiny muted block mt"
				>当前为体验量表，用于展示答题与报告流程。</text
			>
		</view>
		<template #footer
			><view
				class="check-row"
				role="checkbox"
				:aria-checked="consent"
				@click="consent = !consent"
				><view class="check-box" :class="{ checked: consent }"
					><UiIcon
						v-if="consent"
						name="check"
						tone="white"
						:size="25" /></view
				><text>我已阅读并同意测评说明</text></view
			><button class="ui-reset button" @click="startQuiz">
				{{ state.drafts[scale.id] ? "继续测评" : "开始测评" }}
			</button></template
		>
	</AppShell>

	<AppShell v-else-if="mode === 'quiz'" :title="scale.title" back>
		<view class="pad quiz-content">
			<view class="between small"
				><text
					>{{ String(questionIndex + 1).padStart(2, "0") }}
					<text class="muted">/ {{ scale.count }}</text></text
				><text class="muted"
					>{{
						Math.round(((questionIndex + 1) / scale.count) * 100)
					}}%</text
				></view
			>
			<view class="progress-track mt-xs"
				><view
					class="progress-fill"
					:style="{
						width: ((questionIndex + 1) / scale.count) * 100 + '%',
					}"
			/></view>
			<text class="badge neutral quiz-period">过去两周</text
			><text class="question serif block">{{
				questionText
			}}</text>
			<view class="answers"
				><button
					v-for="(option, index) in answerOptions"
					:key="option"
					class="ui-reset answer"
					:class="{ selected: answers[questionIndex] === optionValue(index) }"
					role="radio"
					:aria-checked="answers[questionIndex] === optionValue(index)"
					@click="selectAnswer(optionValue(index))"
				>
					<view class="radio-outer"
						><view
							v-if="answers[questionIndex] === optionValue(index)"
							class="radio-dot" /></view
					><text>{{ option }}</text>
				</button></view
			>
			<view class="quiz-art"
				><Artwork name="leaves" alt="每一次回答，都是向自己靠近"
			/></view>
		</view>
		<template #footer
			><text class="tiny muted block center mb">答题进度自动保存</text
			><view class="footer-row"
				><button
					class="ui-reset button outline"
					:disabled="questionIndex === 0"
					@click="previous"
				>
					上一题</button
				><button class="ui-reset button" @click="nextQuestion">
					{{
						questionIndex === scale.count - 1
							? "提交测评"
							: "下一题"
					}}
				</button></view
			></template
		>
	</AppShell>

	<AppShell v-else title="测评报告" back>
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="保存报告"
				@click="saveReport"
			>
				<UiIcon name="download-simple" /></button
		></template>
		<view class="pad"
			><text class="tiny muted center block"
				>{{
					report.date.split(" ")[0].replaceAll("-", ".")
				}}
				完成测评</text
			>
			<view class="report-hero"
				><view class="report-leaves"><Artwork name="leaves" /></view
				><view
					class="score-ring"
					:style="{ background: `conic-gradient(${reportRisk.level !== 'normal' ? '#c95f5f' : '#e9b89c'} 0% ${reportPercent}%, #dce3d7 ${reportPercent}% 100%)` }"
					><view class="score-inner"
						><text class="score" :class="{ 'risk-score': reportRisk.level !== 'normal' }">{{ report.score }}</text
						><text class="small">{{ scoreLabel }}</text
						><text class="badge" :class="reportRisk.level !== 'normal' ? 'risk-badge' : 'peach'">{{ reportRisk.level !== 'normal' ? "需要及时关注" : "保持关照" }}</text></view
					></view
				></view
			>
			<view class="metrics"
				><view
					v-for="(metric, index) in metrics"
					:key="metric.label"
					class="row gap-sm"
					><text class="metric-label">{{ metric.label }}</text
					><view class="progress-track grow"
						><view
							class="progress-fill"
							:style="{
								width: metric.value + '%',
								background: index === 0 ? '#e9b89c' : '#8ba28a',
							}" /></view
					><text class="small muted">{{ metric.value }}</text></view
				></view
			>
			<view class="report-card card card-pad mt"
				><view v-if="reportRisk.level !== 'normal'" class="risk-alert" role="alert"><UiIcon name="shield-check" tone="danger" :size="30" /><view><text class="body-title block">测评预警</text><text class="small block mt-xs">{{ reportRisk.reason }}</text><text class="tiny block mt-xs">如存在现实危险或无法保证安全，请立即联系当地急救服务或危机干预机构。</text></view></view
				><SectionHeading
					title="结果解读"
					icon="chat-circle-dots"
				/><text class="muted small block">{{
					report.score >= 45
						? "近期可能感到疲惫，试着留出休息时间。"
						: "你的状态较为平稳，请继续照顾自己的感受。"
				}}</text
				><SectionHeading title="给你的建议" icon="plant" /><view
					class="suggestions"
					><view
						v-for="item in suggestions"
						:key="item.title"
						class="suggestion"
						><UiIcon :name="item.icon" :size="43" /><text>{{
							item.title
						}}</text></view
					></view
				></view
			>
			<text class="tiny muted block center mt"
				>本结果仅供自我了解，不作为临床诊断。</text
			><view class="row gap-sm saved-state"
				><UiIcon name="check-circle" :size="29" tone="primary" /><text
					>已保存至我的记录</text
				></view
			>
		</view>
		<template #footer
			><view class="footer-row"
				><button class="ui-reset button outline" @click="restart">
					再测一次</button
				><button class="ui-reset button" @click="go('booking')">
					预约咨询
				</button></view
			></template
		>
	</AppShell>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { state, allScales, allBanners, persist, id, now } from "../services/store.js";
import { options } from "../data/catalog.js";
import { calculateAssessmentScore, evaluateAssessmentRisk } from "../services/domain.js";
import { go, toast } from "../services/navigation.js";
import { queueRecord, recordPayload } from "../services/sync.js";
const props = defineProps({
	mode: String,
	params: { type: Object, default: () => ({}) },
});
const categories = ["全部", "幸福感", "人格", "情绪智商", "情绪", "睡眠", "压力", "人际", "职业", "认知", "气质"];
const banners = computed(() => allBanners().filter((item) => item?.id && typeof item.image === 'string' && /^(builtin:(hero|rest)|\/profile\/upload\/[A-Za-z0-9/_-]+\.(png|jpe?g|webp))$/.test(item.image)));
const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const bannerImageUrl = (path) => `${apiBase}${path}`;
const category = ref("全部"),
	search = ref(""),
	showAll = ref(false),
	consent = ref(true);
const visibleScales = computed(() =>
	allScales()
		.filter(
			(s) =>
				(category.value === "全部" || s.category === category.value) &&
				s.title.includes(search.value),
		)
		.slice(
			0,
			showAll.value || category.value !== "全部" || search.value ? 99 : 2,
		),
);
const scale = computed(
	() => allScales().find((s) => s.id === props.params.id) || allScales()[0],
);
const answerOptions = computed(() => Array.isArray(scale.value?.options) && scale.value.options.length ? scale.value.options : options);
const optionValue = (index) => Number.isFinite(Number(scale.value?.optionValues?.[index])) ? Number(scale.value.optionValues[index]) : index;
const questionText = computed(() => {
	const item = scale.value?.questions?.[questionIndex.value];
	return typeof item === "string" ? item : (item?.text || item?.question || "");
});
const latest = computed(() => state.reports[0]);
const answers = ref([]),
	questionIndex = ref(0);
watch(
	() => props.params.id,
	() => {
		const saved = state.drafts[scale.value.id];
		answers.value = saved?.answers
			? [...saved.answers]
			: Array(scale.value.count).fill(null);
		questionIndex.value = saved?.index || 0;
	},
	{ immediate: true },
);
function saveDraft() {
	state.drafts[scale.value.id] = {
		answers: [...answers.value],
		index: questionIndex.value,
	};
	persist();
}
function selectAnswer(value) {
	answers.value[questionIndex.value] = value;
	saveDraft();
}
function previous() {
	if (questionIndex.value > 0) {
		questionIndex.value--;
		saveDraft();
	}
}
function startQuiz() {
	if (!consent.value) return toast("请先阅读并同意测评说明");
	go("quiz", { id: scale.value.id });
}
function nextQuestion() {
	if (
		answers.value[questionIndex.value] === null ||
		answers.value[questionIndex.value] === undefined
	)
		return toast("请选择一个答案");
	if (questionIndex.value < scale.value.count - 1) {
		questionIndex.value++;
		saveDraft();
		return;
	}
	const score = calculateAssessmentScore(scale.value, answers.value);
	const risk = evaluateAssessmentRisk(scale.value, score);
	const record = {
		id: id("report"),
		scaleId: scale.value.id,
		title: scale.value.title,
		score,
		date: now(),
		answers: [...answers.value],
		riskLevel: risk.level,
		riskReason: risk.reason,
	};
	state.reports.unshift(record);
	delete state.drafts[scale.value.id];
	queueRecord(
		recordPayload("assessment", record, {
			contentKey: scale.value.id,
			title: scale.value.title,
			status: "completed",
			score,
			riskLevel: risk.level,
			riskReason: risk.reason,
		}),
	);
	const redirect = () => { if (persist()) uni.redirectTo({ url: `/pages/assessment/report?record=${record.id}` }); };
	if (risk.level !== "normal") {
		uni.showModal({ title: "测评预警", content: risk.reason, showCancel: false, success: redirect });
	} else redirect();
}
const report = computed(
	() =>
		state.reports.find((r) => r.id === props.params.record) ||
		state.reports[0] || {
			title: "情绪状态自评",
			score: 0,
			date: now(),
			scaleId: "emotion",
		},
);
const metrics = computed(() =>
	["情绪感受", "压力体验", "睡眠状态"].map((label, index) => ({
		label,
		value: report.value.demo
			? [65, 58, 42][index]
			: Math.min(
					100,
					Math.max(0, report.value.score + [3, -4, -10][index]),
				),
	})),
);
const reportScale = computed(() => allScales().find((item) => item.id === report.value.scaleId));
const reportRisk = computed(() => report.value.riskLevel && report.value.riskLevel !== "normal"
	? { level: report.value.riskLevel, reason: report.value.riskReason || "测评结果提示需要进一步关注。" }
	: evaluateAssessmentRisk(reportScale.value, Number(report.value.score) || 0));
const scoreLabel = computed(() => reportScale.value?.scoring?.label || "状态指数");
const reportPercent = computed(() => {
	const max = Number(reportScale.value?.scoring?.maxScore) || 100;
	return Math.max(0, Math.min(100, Math.round((Number(report.value.score || 0) / max) * 100)));
});
const suggestions = [
	{ icon: "moon", title: "规律作息" },
	{ icon: "person-simple-run", title: "适度运动" },
	{ icon: "heart", title: "寻求支持" },
];
function restart() {
	delete state.drafts[report.value.scaleId];
	persist();
	go("assessment", { id: report.value.scaleId });
}
function saveReport() {
	uni.setClipboardData({
		data: `${report.value.title}\n${report.value.date}\n状态指数：${report.value.score}\n本结果仅供自我了解，不作为临床诊断。`,
		success: () => toast("报告摘要已复制"),
	});
}
</script>
<style scoped>
.home-banner {
	width: 100%;
	height: 47.48vw;
	max-height: 204px;
	background: #f4f7f1;
}
.home-banner swiper-item { overflow: hidden; }
.banner-image { display: block; width: 100%; height: 100%; }
.home-main {
	margin-top: -12rpx;
	position: relative;
}
.home-main .section-heading {
	margin-top: 8rpx;
}
.home-main .chip {
	flex: 1;
	padding-left: 16rpx;
	padding-right: 16rpx;
}
.assessment-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 20rpx;
}
.assessment-card {
	text-align: left;
}
.assessment-info {
	padding: 20rpx 18rpx;
}
.assessment-info .body-title {
	font-size: 28rpx;
	white-space: nowrap;
}
.recent-card {
	padding: 19rpx;
	display: flex;
	align-items: center;
	gap: 15rpx;
	width: 100%;
	text-align: left;
}
.recent-card .thumb {
	width: 92rpx;
}
.recent-card .body-title {
	font-size: 25rpx;
}
.recent-card .small {
	font-size: 21rpx;
}
.detail-body {
	padding-top: 30rpx;
}
.detail-body .section-heading {
	margin-top: 56rpx;
}
.description {
	padding-left: 48rpx;
	font-size: 27rpx;
	line-height: 1.8;
}
.source-note { padding: 20rpx; }
.guidelines {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding-left: 15rpx;
	font-size: 25rpx;
	color: var(--muted);
}
.quiz-content {
	padding-top: 26rpx;
}
.quiz-period {
	margin-top: 66rpx;
}
.question {
	font-size: 42rpx;
	font-weight: 600;
	line-height: 1.6;
	margin-top: 34rpx;
	margin-bottom: 40rpx;
}
.answers {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}
.answer {
	border: 1px solid #e3e6df;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	text-align: left;
	min-height: 110rpx;
	padding: 20rpx 30rpx;
	gap: 26rpx;
	background: #fcfcfa;
	font-size: 29rpx;
}
.answer.selected {
	border-color: #9dad9c;
	background: #edf1eb;
}
.radio-outer {
	width: 38rpx;
	height: 38rpx;
	border: 1px solid #8b9593;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}
.selected .radio-outer {
	border: 2px solid var(--primary);
}
.radio-dot {
	width: 20rpx;
	height: 20rpx;
	background: var(--primary);
	border-radius: 50%;
}
.quiz-art {
	margin-top: 66rpx;
}
.report-hero {
	position: relative;
	display: flex;
	justify-content: center;
	padding: 30rpx 0;
	overflow: hidden;
}
.report-leaves {
	position: absolute;
	bottom: 12rpx;
	left: 0;
	right: 0;
	opacity: 0.65;
}
.score-ring {
	width: 290rpx;
	height: 290rpx;
	padding: 15rpx;
	border-radius: 50%;
	z-index: 1;
	transform: rotate(-30deg);
}
.risk-score { color: #b33e3e; }
.risk-badge { background: #fde5e5; color: #a53e3e; }
.risk-alert { display: flex; gap: 18rpx; padding: 20rpx; border-radius: 18rpx; background: #fff2f1; color: #8e3333; margin-bottom: 26rpx; }
.score-inner {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	background: var(--surface);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	transform: rotate(30deg);
}
.score {
	font-size: 90rpx;
	line-height: 1.05;
	font-weight: 600;
	letter-spacing: -5rpx;
	margin-bottom: 10rpx;
}
.score-inner .badge {
	margin-top: 10rpx;
}
.metrics {
	display: flex;
	flex-direction: column;
	gap: 19rpx;
}
.metric-label {
	font-size: 25rpx;
	width: 140rpx;
}
.metrics .progress-track {
	height: 18rpx;
}
.metrics .small {
	width: 40rpx;
	text-align: right;
}
.report-card .section-heading:first-child {
	margin-top: 0;
}
.report-card .small {
	padding-left: 49rpx;
}
.suggestions {
	display: flex;
	gap: 16rpx;
}
.suggestion {
	flex: 1;
	background: #f1f4ed;
	border-radius: 16rpx;
	padding: 23rpx 5rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 15rpx;
	font-size: 24rpx;
}
.saved-state {
	justify-content: center;
	color: var(--muted);
	font-size: 23rpx;
	margin-top: 16rpx;
}
</style>
