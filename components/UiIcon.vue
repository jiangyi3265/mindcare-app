<template>
	<image
		class="ui-icon"
		:src="`/static/icons/${tone}/${name}.png`"
		:style="{ width: size + 'rpx', height: size + 'rpx' }"
		mode="aspectFit"
		:aria-label="label || undefined"
		:aria-hidden="!label"
	/>
</template>
<script setup>
defineProps({
	name: { type: String, default: "leaf" },
	tone: { type: String, default: "ink" },
	size: { type: [Number, String], default: 40 },
	label: String,
});
</script>
<style scoped>
.ui-icon {
	display: inline-block;
	flex-shrink: 0;
	vertical-align: middle;
}
</style>
