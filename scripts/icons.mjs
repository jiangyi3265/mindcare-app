import fs from "node:fs/promises";
import sharp from "sharp";
const names = [
	"leaf",
	"bell",
	"magnifying-glass",
	"caret-right",
	"caret-left",
	"caret-down",
	"check",
	"check-circle",
	"shield-check",
	"clock",
	"download-simple",
	"moon",
	"person-simple-run",
	"heart",
	"chats-circle",
	"chat-circle-dots",
	"video-camera",
	"phone",
	"map-pin",
	"book-open",
	"calendar-check",
	"calendar-blank",
	"user",
	"users",
	"gear-six",
	"clipboard-text",
	"file-text",
	"play-circle",
	"play",
	"headset",
	"info",
	"lock-key",
	"house",
	"cloud-arrow-up",
	"image",
	"plus",
	"minus",
	"x",
	"sign-out",
	"arrow-counter-clockwise",
	"dots-three",
	"envelope-simple",
	"warning-circle",
	"upload-simple",
	"trash",
	"pencil-simple",
	"wechat-logo",
	"check-square",
	"plant",
	"list-checks",
	"arrow-square-out",
	"floppy-disk",
];
for (const [tone, color] of Object.entries({
	ink: "#263c34",
	primary: "#718379",
	muted: "#828c8f",
	white: "#ffffff",
	peach: "#b48668",
})) {
	await fs.mkdir(`static/icons/${tone}`, { recursive: true });
	for (const name of names) {
		const source = await fs.readFile(
			`node_modules/@phosphor-icons/core/assets/regular/${name}.svg`,
			"utf8",
		);
		await sharp(Buffer.from(source.replace(/currentColor/g, color)))
			.resize(96, 96)
			.png()
			.toFile(`static/icons/${tone}/${name}.png`);
	}
}
await fs.copyFile(
	"node_modules/@phosphor-icons/core/LICENSE",
	"static/icons/LICENSE",
);
console.log(`Generated ${names.length * 5} local icons`);
