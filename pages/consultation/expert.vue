<template><ConsultationScreens mode="expert" :params="params" /></template>
<script setup>
import { onLoad } from "@dcloudio/uni-app";
import { ref } from "vue";
import ConsultationScreens from "../../components/ConsultationScreens.vue";

const params = ref({});
onLoad((query) => { params.value = query || {}; });
</script>
