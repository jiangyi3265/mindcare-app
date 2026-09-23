<template><AssessmentScreens mode="detail" :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AssessmentScreens from "../../components/AssessmentScreens.vue";
const params = ref({});
onLoad((query) => {
	params.value = query || {};
});
</script>
