import App from "./App";
import UiIcon from "./components/UiIcon.vue";
import Artwork from "./components/Artwork.vue";
import AppShell from "./components/AppShell.vue";
import SectionHeading from "./components/SectionHeading.vue";

// #ifndef VUE3
import Vue from "vue";
import "./uni.promisify.adaptor";
Vue.config.productionTip = false;
App.mpType = "app";
const app = new Vue({
	...App,
});
app.$mount();
// #endif

// #ifdef VUE3
import { createSSRApp } from "vue";
export function createApp() {
	const app = createSSRApp(App);
	app.component("UiIcon", UiIcon);
	app.component("Artwork", Artwork);
	app.component("AppShell", AppShell);
	app.component("SectionHeading", SectionHeading);
	return {
		app,
	};
}
// #endif
