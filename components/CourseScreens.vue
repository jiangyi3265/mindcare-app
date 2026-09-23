<template>
	<AppShell v-if="mode === 'home'" title="心理课堂" tab="courses">
		<template #right
			><button
				class="ui-reset icon-button"
				aria-label="搜索课程"
				@click="focusSearch = true"
			>
				<UiIcon name="magnifying-glass" /></button
		></template>
		<view class="pad"
			><view class="search-box mb"
				><UiIcon
					name="magnifying-glass"
					tone="muted"
					:size="32" /><input
					v-model="search"
					:focus="focusSearch"
					placeholder="搜索课程"
					aria-label="搜索课程"
					@blur="focusSearch = false" /><button
					v-if="search"
					class="ui-reset search-clear"
					aria-label="清空搜索"
					@click="
						search = '';
						focusSearch = true;
					"
				>
					<UiIcon name="x" tone="muted" :size="25" /></button></view
		></view>
		<Artwork name="classHero" alt="把生活调回舒适的节奏，免费课程" />
		<view class="pad"
			><view class="chip-row"
				><button
					v-for="cat in categories"
					:key="cat"
					class="ui-reset chip"
					:class="{ active: category === cat }"
					@click="category = cat"
				>
					{{ cat }}
				</button></view
			>
			<SectionHeading
				title="为你推荐"
				action="更多"
				@action="
					category = '全部';
					showAll = !showAll;
				"
			/>
			<view class="stack"
				><button
					v-for="course in visibleCourses"
					:key="course.id"
					class="ui-reset course-row card"
					@click="go('lesson', { id: course.id })"
				>
					<view class="course-thumb"
						><Artwork :name="course.art" :aspect="1.25" /><view
							class="thumb-play"
							><UiIcon
								name="play-circle"
								tone="white"
								:size="45" /></view></view
					><view class="grow"
						><text class="body-title block">{{ course.title }}</text
						><text class="small muted block mt-xs"
							>{{ course.minutes }}分钟 ·
							{{ course.learners || "0" }}人学习</text
						><view class="course-free"
							><text class="badge solid">免费</text></view
						></view
					>
				</button></view
			>
			<view v-if="!visibleCourses.length" class="empty"
				>没有找到相关课程，试试其他分类</view
			>
			<SectionHeading
				title="继续学习"
				action="查看全部"
				@action="go('records', { filter: '课程' })"
			/>
			<button
				class="ui-reset card course-row"
				@click="go('lesson', { id: 'breath' })"
			>
				<view class="course-thumb short-thumb"
					><Artwork name="breathing" :aspect="1.5" /><view
						class="thumb-play"
						><UiIcon
							name="play-circle"
							tone="white"
							:size="37" /></view></view
				><view class="grow"
					><text class="body-title block">正念呼吸入门</text
					><text class="tiny muted"
						>已看{{ state.progress.breath?.percent || 0 }}%</text
					><view class="progress-track mt-xs"
						><view
							class="progress-fill"
							:style="{
								width:
									(state.progress.breath?.percent || 0) + '%',
							}" /></view
				></view>
			</button>
		</view>
	</AppShell>
	<AppShell v-else title="课程详情" back>
		<view
			class="video-area"
			:class="{ 'baked-preview': course.hero === 'video' }"
			><video
				v-if="videoSrc && playing"
				id="course-video"
				class="course-video"
				:src="videoSrc"
				:initial-time="progress.seconds || 0"
				controls
				autoplay
				@timeupdate="updateProgress"
				@pause="persist"
				@ended="finish"
				@error="videoError" /><template v-else
				><Artwork
					:name="course.hero || 'video'"
					:alt="course.title" /><button
					class="ui-reset play-button"
					aria-label="播放课程"
					@click="play"
				>
					<UiIcon
						name="play-circle"
						tone="white"
						:size="132"
					/></button
				><view class="video-controls"
					><UiIcon name="play" tone="white" :size="30" /><text
						>{{ timeText }} /
						{{ String(course.minutes).padStart(2, "0") }}:00</text
					><view class="video-line"
						><view
							:style="{ width: progress.percent + '%' }" /></view
					><UiIcon
						name="arrow-square-out"
						tone="white"
						:size="27" /></view></template
		></view>
		<view class="pad"
			><view class="between mt lesson-heading"
				><text class="subtitle">{{ course.title }}</text
				><text class="badge solid">免费</text
				><text class="small muted">{{ course.minutes }}分钟</text></view
			>
			<view class="teacher row gap"
				><view class="teacher-avatar"
					><Artwork name="instructor" :aspect="1" /></view
				><view
					><text class="body-title"
						>{{ course.teacher }} · 心理健康讲师</text
					><text class="small muted block"
						>带你在日常生活里，找回内心的平静。</text
					></view
				></view
			>
			<view class="lesson-tabs"
				><button
					class="ui-reset"
					v-for="tab in ['课程介绍', '课程目录']"
					:key="tab"
					:class="{ active: lessonTab === tab }"
					@click="lessonTab = tab"
				>
					{{ tab }}
				</button></view
			>
			<view v-if="lessonTab === '课程目录'" class="chapter-list"
				><button
					v-for="(chapter, index) in course.chapters"
					:key="chapter.title"
					class="ui-reset chapter"
					:class="{ active: chapterIndex === index }"
					@click="selectChapter(index)"
				>
					<text class="chapter-number">{{
						String(index + 1).padStart(2, "0")
					}}</text
					><text class="grow">{{ chapter.title }}</text
					><text class="small muted">{{ chapter.duration }}</text
					><UiIcon
						:name="
							chapterComplete(index)
								? 'check-circle'
								: chapterIndex === index
									? 'play-circle'
									: 'clock'
						"
						tone="primary"
						:size="29"
					/><text class="tiny muted">{{
						chapterComplete(index)
							? "已看完"
							: chapterIndex === index && progress.seconds > 0
								? "学习中"
								: "未观看"
					}}</text>
				</button></view
			>
			<view v-else class="lesson-intro"
				><text>{{ course.intro }}</text
				><text class="block mt muted small"
					>适合希望了解自我、学习放松技巧的你。所有课程均可免费观看。</text
				></view
			>
			<view class="soft-card mt"
				><view class="between"
					><text class="body-title"
						>本课已看{{ progress.percent || 0 }}%</text
					><text class="tiny muted">观看记录自动保存</text></view
				><view class="progress-track mt-sm"
					><view
						class="progress-fill"
						:style="{ width: progress.percent + '%' }" /></view
			></view>
			<view v-if="playError" class="notice mt"
				><UiIcon name="info" :size="32" /><text>{{
					playError
				}}</text></view
			>
		</view>
		<template #footer
			><button class="ui-reset button" @click="play">
				{{ progress.percent ? "继续观看" : "开始观看" }}
			</button></template
		>
	</AppShell>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { state, allCourses, persist, now } from "../services/store.js";
import { go } from "../services/navigation.js";
import { loadVideo } from "../services/media.js";
import { queueRecord, recordPayload } from "../services/sync.js";
const props = defineProps({
	mode: String,
	params: { type: Object, default: () => ({}) },
});
const search = ref(""),
	focusSearch = ref(false),
	category = ref("情绪管理"),
	showAll = ref(false),
	lessonTab = ref("课程目录"),
	playing = ref(false),
	playError = ref(""),
	chapterIndex = ref(0);
const categories = computed(() => [
	"全部",
	...new Set([
		...state.courseCategories,
		...allCourses().map((c) => c.category),
	]),
]);
const visibleCourses = computed(() =>
	allCourses()
		.filter(
			(c) =>
				(category.value === "全部" || c.category === category.value) &&
				c.title.includes(search.value),
		)
		.slice(0, showAll.value ? 99 : 4),
);
const course = computed(
	() => allCourses().find((c) => c.id === props.params.id) || allCourses()[0],
);
const progress = computed(
	() => state.progress[course.value.id] || { percent: 0, seconds: 0 },
);
const chapterOffsets = computed(() => {
	let elapsed = 0;
	return course.value.chapters.map((chapter) => {
		const start = elapsed;
		const [minutes, seconds] = chapter.duration.split(":").map(Number);
		elapsed += minutes * 60 + seconds;
		return { start, end: elapsed };
	});
});
watch(
	() => progress.value.seconds,
	(seconds) => {
		chapterIndex.value = Math.max(
			0,
			chapterOffsets.value.findIndex(
				(chapter, index) =>
					seconds < chapter.end ||
					index === chapterOffsets.value.length - 1,
			),
		);
	},
	{ immediate: true },
);
function chapterComplete(index) {
	return (
		progress.value.percent === 100 ||
		progress.value.seconds >= chapterOffsets.value[index].end
	);
}
const timeText = computed(
	() =>
		`${String(Math.floor((progress.value.seconds || 0) / 60)).padStart(2, "0")}:${String(Math.floor((progress.value.seconds || 0) % 60)).padStart(2, "0")}`,
);
const videoSrc = ref("");
onBeforeUnmount(() => {
	persist();
	queueCourseProgress(0);
	// #ifdef H5
	if (videoSrc.value.startsWith("blob:")) URL.revokeObjectURL(videoSrc.value);
	// #endif
});
async function play() {
	try {
		if (videoSrc.value && playing.value) {
			uni.createVideoContext("course-video").play();
			return;
		}
		// #ifdef H5
		if (videoSrc.value.startsWith("blob:"))
			URL.revokeObjectURL(videoSrc.value);
		// #endif
		videoSrc.value = await loadVideo(course.value);
		if (!videoSrc.value) {
			playError.value = "这节课程的视频正在准备中，请稍后再来。";
			return;
		}
		playing.value = true;
		playError.value = "";
	} catch {
		playError.value = "视频无法读取，请重新上传课程视频。";
	}
}
let lastSaved = 0;
function queueCourseProgress(delay = 10000) {
	const current = state.progress[course.value.id];
	if (!current) return;
	const localRecord = {
		id: `course-${course.value.id}`,
		title: course.value.title,
		...current,
	};
	queueRecord(
		recordPayload("course", localRecord, {
			contentKey: course.value.id,
			title: course.value.title,
			progress: current.percent,
			status: current.percent === 100 ? "completed" : "in_progress",
		}),
		delay,
	);
}
function updateProgress(event) {
	const { currentTime, duration } = event.detail;
	if (!duration) return;
	const percent = Math.min(100, Math.round((currentTime / duration) * 100));
	state.progress[course.value.id] = {
		percent,
		seconds: currentTime,
		date: now(),
	};
	if (Date.now() - lastSaved > 3000) {
		persist();
		queueCourseProgress();
		lastSaved = Date.now();
	}
}
function finish() {
	state.progress[course.value.id] = {
		percent: 100,
		seconds: course.value.minutes * 60,
		date: now(),
	};
	persist();
	queueCourseProgress(0);
}
function videoError() {
	playError.value = "视频暂时无法加载，请检查网络或重新上传课程视频。";
	playing.value = false;
}
function selectChapter(index) {
	if (playing.value) {
		uni.createVideoContext("course-video").seek(
			chapterOffsets.value[index].start,
		);
	} else {
		playError.value = "请先开始播放，再选择想看的章节。";
	}
}
</script>
<style scoped>
.course-row {
	display: flex;
	align-items: center;
	gap: 22rpx;
	padding: 17rpx;
	width: 100%;
	text-align: left;
}
.course-thumb {
	width: 228rpx;
	position: relative;
	border-radius: 14rpx;
	overflow: hidden;
	flex-shrink: 0;
}
.course-thumb.short-thumb {
	width: 190rpx;
}
.thumb-play {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #183b260a;
}
.course-free {
	text-align: right;
	margin-top: 10rpx;
}
.course-row .body-title {
	font-size: 28rpx;
}
.course-row .small {
	font-size: 23rpx;
}
.pad > .section-heading {
	margin-top: 16rpx;
}
.video-area {
	position: relative;
}
.play-button {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
}
.video-controls {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	background: #18241a70;
	color: white;
	display: flex;
	align-items: center;
	gap: 15rpx;
	padding: 14rpx 20rpx;
	font-size: 21rpx;
}
.video-line {
	height: 5rpx;
	flex: 1;
	background: #ffffff70;
}
.video-line view {
	height: 100%;
	background: white;
}
.course-video {
	display: block;
	width: 100%;
	height: 422rpx;
}
.teacher {
	margin: 32rpx 0 38rpx;
}
.lesson-heading {
	gap: 14rpx;
	align-items: flex-start;
	flex-wrap: wrap;
}
.lesson-heading .subtitle {
	flex: 1;
	min-width: 200rpx;
}
.lesson-heading .badge,
.lesson-heading .small {
	flex-shrink: 0;
	margin-top: 6rpx;
}
.teacher-avatar {
	width: 100rpx;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
}
.teacher .body-title {
	font-size: 27rpx;
}
.lesson-tabs {
	display: flex;
	border-bottom: 1px solid var(--line);
}
.lesson-tabs button {
	flex: 1;
	color: var(--muted);
	padding: 16rpx 0;
	font-size: 27rpx;
	position: relative;
}
.lesson-tabs button.active {
	color: var(--ink);
	font-weight: 600;
}
.lesson-tabs .active:after {
	content: "";
	position: absolute;
	bottom: 0;
	left: 25%;
	right: 25%;
	border-bottom: 3px solid var(--primary);
	border-radius: 4rpx;
}
.chapter {
	display: flex;
	align-items: center;
	gap: 15rpx;
	padding: 23rpx 13rpx;
	text-align: left;
	font-size: 27rpx;
	width: 100%;
}
.chapter.active {
	background: #eff4ed;
	border-radius: 12rpx;
}
.chapter-number {
	width: 40rpx;
}
.chapter .tiny {
	white-space: nowrap;
}
.lesson-intro {
	padding: 30rpx 0;
	line-height: 1.9;
	min-height: 250rpx;
}
.thumb-play {
	display: none;
}
.baked-preview .play-button .ui-icon {
	opacity: 0;
}
.baked-preview .video-controls {
	bottom: 0;
	background: #18241ab0;
}
</style>
