<template>
	<view class="qr-code" role="img" aria-label="报名签到码"
		><view v-for="(row, y) in matrix" :key="y" class="qr-row"
			><view
				v-for="(dark, x) in row"
				:key="x"
				class="qr-cell"
				:class="{ dark }" /></view
	></view>
</template>
<script setup>
import { computed } from "vue";
import qrcode from "qrcode-generator";
const props = defineProps({ value: String });
const matrix = computed(() => {
	const qr = qrcode(0, "M");
	qr.addData(props.value || "mindcare");
	qr.make();
	return Array.from({ length: qr.getModuleCount() }, (_, y) =>
		Array.from({ length: qr.getModuleCount() }, (_, x) => qr.isDark(y, x)),
	);
});
</script>
<style scoped>
.qr-code {
	width: 184rpx;
	height: 184rpx;
	display: flex;
	flex-direction: column;
	background: white;
	padding: 8rpx;
	margin: 0 auto 13rpx;
}
.qr-row {
	flex: 1;
	display: flex;
}
.qr-cell {
	flex: 1;
	background: #fff;
}
.qr-cell.dark {
	background: #263c34;
}
</style>
