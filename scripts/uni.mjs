import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = process.cwd();
const child = spawn(
	process.execPath,
	[
		resolve(root, "node_modules/@dcloudio/vite-plugin-uni/bin/uni.js"),
		...process.argv.slice(2),
	],
	{
		stdio: "inherit",
		env: { ...process.env, UNI_INPUT_DIR: root },
	},
);
child.on("exit", (code) => process.exit(code ?? 1));
