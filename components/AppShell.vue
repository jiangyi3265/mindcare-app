<template>
	<view
		class="app-shell"
		:class="{ 'has-tabs': tab, 'has-footer': $slots.footer }"
		:style="footerHeight ? { paddingBottom: footerHeight + 20 + 'px' } : {}"
	>
		<view class="app-header"
			><view class="header-side"
				><button
					v-if="back"
					class="ui-reset icon-button"
					aria-label="返回"
					@click="goBack"
				>
					<UiIcon name="caret-left" /></button
				><slot name="left" /></view
			><text class="header-title">{{ title }}</text
			><view class="header-side header-right"><slot name="right" /></view
		></view>
		<view class="page-content"><slot /></view>
		<view v-if="$slots.footer" class="fixed-footer"
			><slot name="footer"
		/></view>
		<view v-if="tab" class="tab-bar" :class="{ 'admin-tabs': admin }">
			<button
				v-for="item in tabs"
				:key="item.key"
				class="ui-reset tab-item"
				:class="{ active: tab === item.key }"
				@click="tab !== item.key && go(item.route, {}, true)"
				:aria-label="item.label"
				:aria-current="tab === item.key ? 'page' : undefined"
			>
				<view class="tab-icon-wrap"
					><UiIcon
						:name="item.icon"
						:tone="tab === item.key ? 'primary' : 'muted'"
						:size="39" /></view
				><text>{{ item.label }}</text>
			</button>
		</view>
	</view>
</template>
<script setup>
import {
	computed,
	ref,
	getCurrentInstance,
	onMounted,
	onUpdated,
	onBeforeUnmount,
} from "vue";
import { go, goBack } from "../services/navigation.js";
const props = defineProps({
	title: String,
	back: Boolean,
	tab: String,
	admin: Boolean,
});
const instance = getCurrentInstance();
const footerHeight = ref(0);
let measuring = false;
function measureFooter() {
	if (measuring) return;
	measuring = true;
	uni.createSelectorQuery()
		.in(instance.proxy)
		.select(".fixed-footer")
		.boundingClientRect((rect) => {
			footerHeight.value = Math.ceil(rect?.height || 0);
			measuring = false;
		})
		.exec();
}
onMounted(() => {
	measureFooter();
	uni.onWindowResize(measureFooter);
});
onUpdated(measureFooter);
onBeforeUnmount(() => uni.offWindowResize(measureFooter));
const tabs = computed(() =>
	props.admin
		? [
				{
					key: "overview",
					label: "概览",
					icon: "house",
					route: "admin",
				},
				{
					key: "content",
					label: "内容",
					icon: "clipboard-text",
					route: "manage",
				},
				{
					key: "users",
					label: "用户",
					icon: "user",
					route: "manageUsers",
				},
				{
					key: "messages",
					label: "咨询",
					icon: "chats-circle",
					route: "manageMessages",
				},
			]
		: [
				{
					key: "assessment",
					label: "测评",
					icon: "leaf",
					route: "home",
				},
				{
					key: "consultation",
					label: "咨询",
					icon: "chats-circle",
					route: "consultation",
				},
				{
					key: "courses",
					label: "课堂",
					icon: "book-open",
					route: "courses",
				},
				{
					key: "activities",
					label: "活动",
					icon: "calendar-check",
					route: "activities",
				},
				{
					key: "profile",
					label: "我的",
					icon: "user",
					route: "profile",
				},
			],
);
</script>
