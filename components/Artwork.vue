<template>
	<view
		class="artwork"
		:style="{ paddingTop: ratio + '%' }"
		:aria-label="alt"
		role="img"
	>
		<image
			:src="`/static/art/board-${art[0]}.webp`"
			mode="widthFix"
			class="art-source"
			:style="imageStyle"
			:draggable="false"
		/>
		<slot />
	</view>
</template>
<script setup>
import { computed } from "vue";
import { artwork } from "../data/artwork.js";
const props = defineProps({
	name: { type: String, default: "leaves" },
	alt: { type: String, default: "" },
	aspect: Number,
});
const art = computed(() => artwork[props.name] || artwork.leaves);
const ratio = computed(() =>
	props.aspect ? 100 / props.aspect : (art.value[4] / art.value[3]) * 100,
);
const imageStyle = computed(() => {
	const [, x, y, width, height] = art.value;
	const targetAspect = props.aspect || width / height;
	const cropWidth = Math.min(width, height * targetAspect),
		cropHeight = cropWidth / targetAspect;
	const cropX = x + (width - cropWidth) / 2,
		cropY = y + (height - cropHeight) / 2;
	return {
		width: (1942 / cropWidth) * 100 + "%",
		left: (-cropX / cropWidth) * 100 + "%",
		top: (-cropY / cropHeight) * 100 + "%",
	};
});
</script>
<style scoped>
.artwork {
	position: relative;
	overflow: hidden;
	width: 100%;
	background: #f0f2e9;
	flex-shrink: 0;
}
.art-source {
	position: absolute;
	max-width: none;
	display: block;
	pointer-events: none;
}
</style>
