export const routes = {
	home: "index/index",
	assessment: "assessment/detail",
	quiz: "assessment/quiz",
	report: "assessment/report",
	consultation: "consultation/index",
	expert: "consultation/expert",
	booking: "consultation/booking",
	courses: "courses/index",
	lesson: "courses/detail",
	activities: "activities/index",
	activity: "activities/detail",
	signup: "activities/signup",
	success: "activities/success",
	profile: "profile/index",
	records: "profile/records",
	account: "account/index",
};
export function go(name, query = {}, root = false) {
	const params = Object.entries(query)
		.filter(([, v]) => v !== undefined)
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join("&");
	const url = `/pages/${routes[name] || name}${params ? "?" + params : ""}`;
	if (root) uni.reLaunch({ url });
	else uni.navigateTo({ url });
}
export function goBack() {
	if (getCurrentPages().length > 1) uni.navigateBack();
	else go("home", {}, true);
}
export const toast = (title) => uni.showToast({ title, icon: "none" });
export const explain = (title, content) =>
	uni.showModal({
		title,
		content,
		showCancel: false,
		confirmColor: "#657c70",
	});
