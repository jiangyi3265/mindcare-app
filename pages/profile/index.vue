<template><ProfileScreens mode="home" :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import ProfileScreens from "../../components/ProfileScreens.vue";
const params = ref({});
onLoad((query) => {
	params.value = query || {};
});
</script>
