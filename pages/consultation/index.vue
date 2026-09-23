<template><ConsultationScreens mode="home" :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import ConsultationScreens from "../../components/ConsultationScreens.vue";
const params = ref({});
onLoad((query) => {
	params.value = query || {};
});
</script>
