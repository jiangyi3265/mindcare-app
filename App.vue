<script>
import { bootstrapMindcare } from "./services/sync.js";

export default {
	onLaunch: function () {
		bootstrapMindcare();
	},
	onShow: function () {
		bootstrapMindcare();
	},
};
</script>

<style>
@import "./styles/theme.css";
</style>
