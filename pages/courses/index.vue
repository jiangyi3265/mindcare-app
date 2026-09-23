<template><CourseScreens mode="home" :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import CourseScreens from "../../components/CourseScreens.vue";
const params = ref({});
onLoad((query) => {
	params.value = query || {};
});
</script>
