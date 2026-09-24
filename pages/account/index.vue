<template><AuthScreens :params="params" /></template>
<script setup>
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AuthScreens from "../../components/AuthScreens.vue";
const params = ref({});
onLoad((query) => { params.value = query || {}; });
</script>
