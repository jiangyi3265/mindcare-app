<template><ActivityScreens mode="home" :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import ActivityScreens from "../../components/ActivityScreens.vue";
const params = ref({});
onLoad((query) => {
	params.value = query || {};
});
</script>
