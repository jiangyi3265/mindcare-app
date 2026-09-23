import fs from "node:fs/promises";
import sharp from "sharp";
await fs.mkdir("design-reference", { recursive: true });
for (const n of [1, 2, 3]) {
	const source = `design-reference/board-${n}.png`;
	await sharp(source)
		.webp({ quality: 95, effort: 6 })
		.toFile(`static/art/board-${n}.webp`);
	console.log(n, (await fs.stat(`static/art/board-${n}.webp`)).size);
}
