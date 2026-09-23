<script>
import { bootstrapMindcare, flushPendingRecords } from "./services/sync.js";

export default {
	onLaunch: function () {
		bootstrapMindcare();
	},
	onShow: function () {
		flushPendingRecords().catch(() => {});
	},
};
</script>

<style>
@import "./styles/theme.css";
</style>
