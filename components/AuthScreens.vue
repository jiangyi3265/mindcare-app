<template>
	<AppShell :title="heading" back>
		<view class="auth-page">
			<view class="auth-intro">
				<text class="auth-eyebrow">MindCare 账号</text>
				<text class="title block mt-sm">{{ recoveryCode ? "请保存恢复码" : heading }}</text>
				<text class="small muted block mt-sm">{{ recoveryCode
					? "这是找回账号的唯一凭据，仅显示这一次。"
					: mode === "login" ? "登录后，你的测评、预约、课程与活动记录会跟随账号。"
					: mode === "register" ? "创建账号，并把当前设备已有记录带到账号里。"
					: "使用注册时保存的恢复码重设密码。" }}</text>
			</view>

			<view v-if="recoveryCode" class="recovery-result">
				<text class="auth-label block">你的新恢复码</text>
				<text class="recovery-value" selectable>{{ recoveryCode }}</text>
				<text class="small muted block">请截图或保存在密码管理器中，切勿转发他人。</text>
				<button class="ui-reset button outline mt" @click="copyCode">复制恢复码</button>
				<button class="ui-reset acknowledgement mt" :aria-pressed="acknowledged" @click="acknowledged = !acknowledged">
					<text class="check-box" :class="{ checked: acknowledged }">{{ acknowledged ? "✓" : "" }}</text>
					<text>我已妥善保存恢复码</text>
				</button>
				<button class="ui-reset button mt" :disabled="!acknowledged" @click="go('profile', {}, true)">进入我的账号</button>
			</view>

			<template v-else>
				<view v-if="mode !== 'recover'" class="auth-switch" role="tablist" aria-label="账号操作">
					<button class="ui-reset" role="tab" :aria-selected="mode === 'login'" :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
					<button class="ui-reset" role="tab" :aria-selected="mode === 'register'" :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
				</view>

				<view class="auth-form">
					<view class="auth-field">
						<text class="auth-label">手机号</text>
						<input class="input" v-model="phone" type="number" maxlength="11" placeholder="请输入11位手机号" aria-label="手机号" />
					</view>
					<view v-if="mode === 'register'" class="auth-field">
						<text class="auth-label">昵称 <text class="muted tiny">选填</text></text>
						<input class="input" v-model="nickname" maxlength="20" placeholder="想让我们怎么称呼你？" aria-label="昵称" />
					</view>
					<view v-if="mode === 'recover'" class="auth-field">
						<text class="auth-label">恢复码</text>
						<input class="input" v-model="enteredCode" maxlength="48" placeholder="注册时保存的恢复码" aria-label="恢复码" />
					</view>
					<view class="auth-field">
						<text class="auth-label">{{ mode === 'recover' ? '新密码' : '密码' }}</text>
						<input class="input" v-model="password" type="password" maxlength="72" placeholder="至少8位，包含字母和数字" :aria-label="mode === 'recover' ? '新密码' : '密码'" />
					</view>
					<view v-if="mode !== 'login'" class="auth-field">
						<text class="auth-label">确认密码</text>
						<input class="input" v-model="confirmation" type="password" maxlength="72" placeholder="再次输入密码" aria-label="确认密码" />
					</view>
					<text v-if="error" class="error-text block" role="alert">{{ error }}</text>
					<button class="ui-reset button submit-button" :disabled="busy" @click="submit">{{ busy ? "请稍候…" : heading }}</button>
					<button v-if="mode === 'login'" class="ui-reset auth-link" @click="switchMode('recover')">忘记密码？使用恢复码找回</button>
					<button v-else-if="mode === 'recover'" class="ui-reset auth-link" @click="switchMode('login')">返回登录</button>
				</view>
			</template>
		</view>
	</AppShell>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { go, toast } from "../services/navigation.js";
import { state } from "../services/store.js";
import { loginWithPassword, recoverWithCode, registerWithPassword } from "../services/sync.js";

const props = defineProps({ params: { type: Object, default: () => ({}) } });
const mode = ref("login");
const phone = ref("");
const nickname = ref("");
const enteredCode = ref("");
const password = ref("");
const confirmation = ref("");
const recoveryCode = ref("");
const acknowledged = ref(false);
const error = ref("");
const busy = ref(false);
const heading = computed(() => ({ login: "登录账号", register: "注册账号", recover: "找回密码" })[mode.value]);

watch(() => props.params.mode, (value) => {
	mode.value = ["login", "register", "recover"].includes(value) ? value : "login";
}, { immediate: true });

function switchMode(next) {
	mode.value = next;
	error.value = "";
	password.value = "";
	confirmation.value = "";
	enteredCode.value = "";
}

async function submit() {
	if (busy.value) return;
	error.value = "";
	const number = phone.value.trim();
	if (!/^1[3-9]\d{9}$/.test(number)) return (error.value = "请输入正确的11位手机号");
	if (mode.value !== "login" && (password.value.length < 8 || password.value.length > 72 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value))) {
		return (error.value = "密码需为8到72位，且包含字母和数字");
	}
	if (!password.value) return (error.value = "请输入密码");
	if (mode.value !== "login" && password.value !== confirmation.value) return (error.value = "两次输入的密码不一致");
	if (mode.value === "recover" && !enteredCode.value.trim()) return (error.value = "请输入恢复码");
	busy.value = true;
	try {
		if (mode.value === "login") {
			await loginWithPassword({ phone: number, password: password.value });
			toast("登录成功");
			go("profile", {}, true);
		} else {
			const result = mode.value === "register"
				? await registerWithPassword({ phone: number, password: password.value, nickname: nickname.value.trim() || state.profile.name })
				: await recoverWithCode({ phone: number, recoveryCode: enteredCode.value.trim(), newPassword: password.value });
			recoveryCode.value = result.recoveryCode;
			password.value = "";
			confirmation.value = "";
			enteredCode.value = "";
		}
	} catch (cause) {
		error.value = cause.message || "操作失败，请稍后再试";
	} finally {
		busy.value = false;
	}
}

function copyCode() {
	uni.setClipboardData({ data: recoveryCode.value, success: () => toast("已复制，请妥善保存") });
}
</script>

<style scoped>
.auth-page { padding: 42rpx 32rpx 64rpx; }
.auth-intro { padding: 10rpx 0 38rpx; }
.auth-eyebrow { font-size: 22rpx; letter-spacing: 2rpx; color: var(--primary-dark); font-weight: 600; }
.auth-switch { display: flex; gap: 32rpx; border-bottom: 1px solid var(--line); margin-bottom: 34rpx; }
.auth-switch button { min-height: 70rpx; padding: 0 8rpx; color: var(--muted-strong); font-size: 28rpx; border-bottom: 3rpx solid transparent; }
.auth-switch button.active { color: var(--ink); font-weight: 600; border-bottom-color: var(--primary); }
.auth-field { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 26rpx; }
.auth-label { font-size: 25rpx; font-weight: 500; color: var(--ink); }
.auth-field .input { width: 100%; min-height: 88rpx; font-size: 27rpx; }
.submit-button { margin-top: 34rpx; }
.auth-link { display: block; margin: 20rpx auto 0; min-height: 60rpx; padding: 12rpx; color: var(--primary-dark); font-size: 24rpx; }
.recovery-result { padding: 27rpx; border-radius: 22rpx; background: var(--pale); }
.recovery-value { display: block; margin: 18rpx 0; padding: 22rpx 12rpx; background: #fafbf8; border: 1px solid var(--line); border-radius: 14rpx; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 25rpx; line-height: 1.6; text-align: center; overflow-wrap: anywhere; user-select: all; }
.acknowledgement { display: flex; align-items: center; gap: 12rpx; min-height: 64rpx; font-size: 24rpx; text-align: left; }
.check-box { width: 32rpx; height: 32rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--primary); border-radius: 7rpx; }
.check-box.checked { background: var(--primary); color: #fafbf8; }
</style>
