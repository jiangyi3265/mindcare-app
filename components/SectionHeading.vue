<template>
	<view class="section-heading"
		><view class="row gap-sm"
			><UiIcon v-if="icon" :name="icon" :size="36" /><text>{{
				title
			}}</text></view
		><button
			v-if="action"
			class="ui-reset text-action"
			@click="$emit('action')"
		>
			{{ action
			}}<UiIcon name="caret-right" tone="muted" :size="24" /></button
	></view>
</template>
<script setup>
defineProps({ title: String, action: String, icon: String });
defineEmits(["action"]);
</script>
