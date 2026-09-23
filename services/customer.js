import { state, persist, id, now } from "./store.js";
import { explain, toast } from "./navigation.js";
import { queueRecord, recordPayload } from "./sync.js";
export function contactCustomer() {
	if (!state.service.corpId || !state.service.url) {
		uni.showModal({
			title: "联系平台客服",
			content:
				"微信客服暂未开放，你可以先留下问题，客服接入后将提供在线服务。",
			confirmText: "留下问题",
			cancelText: "稍后再说",
			confirmColor: "#657c70",
			success: (res) => {
				if (res.confirm) leaveMessage();
			},
		});
		return;
	}
	// #ifdef MP-WEIXIN
	wx.openCustomerServiceChat({
		extInfo: { url: state.service.url },
		corpId: state.service.corpId,
		fail: () => explain("暂时无法连接", "请稍后重试，或在此留下你的问题。"),
	});
	// #endif
	// #ifdef H5
	window.location.assign(state.service.url);
	// #endif
	// #ifndef H5
	// #ifndef MP-WEIXIN
	explain("微信客服", "请通过微信小程序联系官方客服。");
	// #endif
	// #endif
}
export function leaveMessage() {
	uni.showModal({
		title: "咨询留言",
		editable: true,
		placeholderText: "写下你想咨询的问题",
		confirmColor: "#657c70",
		success: (r) => {
			if (r.confirm && r.content?.trim()) {
				const message = {
					id: id("msg"),
					name: state.profile.name,
					text: r.content.trim(),
					date: now(),
					status: "待回复",
				};
				state.messages.unshift(message);
				queueRecord(recordPayload("message", message, { title: "用户咨询留言" }));
				persist();
				toast("留言已提交");
			}
		},
	});
}
