import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
export async function launchBrowser() {
	let executablePath = process.env.CHROME_PATH;
	if (!executablePath && process.platform === "win32") {
		const cache = path.join(
			process.env.LOCALAPPDATA || "",
			"ms-playwright",
		);
		if (fs.existsSync(cache)) {
			for (const name of fs
				.readdirSync(cache)
				.filter((n) => /^chromium-\d+$/.test(n))
				.sort(
					(a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]),
				)) {
				const candidate = path.join(
					cache,
					name,
					"chrome-win64",
					"chrome.exe",
				);
				if (fs.existsSync(candidate)) {
					executablePath = candidate;
					break;
				}
			}
		}
	}
	return chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : {}),
	});
}
