import { launchBrowser } from "./browser.mjs";
import fs from "node:fs/promises";
import path from "node:path";
const browser = await launchBrowser();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 1,
	isMobile: true,
	hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
	if (m.type() === "error") errors.push(m.text());
});
const pages = JSON.parse(await fs.readFile("pages.json", "utf8")).pages;
await fs.mkdir("test-results/screenshots", { recursive: true });
for (const [i, item] of pages.entries()) {
	await page.goto("http://127.0.0.1:5173/#/" + item.path);
	await page.locator(".app-shell").waitFor({ timeout: 30000 });
	await page.waitForTimeout(350);
	await page.screenshot({
		path: `test-results/screenshots/${String(i + 1).padStart(2, "0")}.png`,
		fullPage: true,
	});
	const metrics = await page.evaluate(() => ({
		width: innerWidth,
		scrollWidth: document.documentElement.scrollWidth,
		buttons: [...document.querySelectorAll(".button")].map((b) => ({
			text: b.innerText,
			background: getComputedStyle(b).backgroundColor,
		})),
		images: [...document.images]
			.filter((img) => !img.complete || img.naturalWidth === 0)
			.map((img) => img.src),
	}));
	console.log(JSON.stringify({ page: item.path, ...metrics }));
}
await fs.writeFile(
	"test-results/browser-errors.json",
	JSON.stringify(errors, null, 2),
);
await browser.close();
if (errors.length) {
	console.error(errors);
	process.exit(1);
}
