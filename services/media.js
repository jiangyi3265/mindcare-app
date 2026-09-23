// Local media persistence for the frontend prototype. Production should use a server URL.
export async function saveVideo(file) {
	const key = "video-" + Date.now();
	// #ifdef H5
	const response = await fetch(file.tempFilePath);
	const blob = await response.blob();
	const db = await mediaDB();
	await new Promise((resolve, reject) => {
		const tx = db.transaction("media", "readwrite");
		tx.objectStore("media").put(blob, key);
		tx.oncomplete = resolve;
		tx.onerror = () => reject(tx.error);
	});
	db.close();
	return { mediaKey: key };
	// #endif
	// #ifndef H5
	return new Promise((resolve, reject) =>
		uni.saveFile({
			tempFilePath: file.tempFilePath,
			success: (r) => resolve({ video: r.savedFilePath }),
			fail: reject,
		}),
	);
	// #endif
}
export async function loadVideo(course) {
	if (course.video) return course.video;
	// #ifdef H5
	if (course.mediaKey) {
		const db = await mediaDB();
		const blob = await new Promise((resolve, reject) => {
			const req = db
				.transaction("media")
				.objectStore("media")
				.get(course.mediaKey);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		db.close();
		if (blob) return URL.createObjectURL(blob);
	}
	// #endif
	return "";
}
// #ifdef H5
function mediaDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open("mindcare-media", 1);
		req.onupgradeneeded = () => req.result.createObjectStore("media");
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
// #endif
export function chooseScaleFile() {
	return new Promise((resolve, reject) => {
		const options = {
			count: 1,
			type: "file",
			extension: ["json"],
			success: async (result) => {
				try {
					const file = result.tempFiles[0];
					// #ifdef H5
					const text = await (await fetch(file.path)).text();
					resolve({ name: file.name, text });
					// #endif
					// #ifdef MP-WEIXIN
					wx.getFileSystemManager().readFile({
						filePath: file.path,
						encoding: "utf8",
						success: (r) =>
							resolve({ name: file.name, text: r.data }),
						fail: reject,
					});
					// #endif
					// #ifndef H5
					// #ifndef MP-WEIXIN
					reject(new Error("请在 H5 或微信小程序中导入 JSON 量表"));
					// #endif
					// #endif
				} catch (error) {
					reject(error);
				}
			},
			fail: reject,
		};
		// #ifdef MP-WEIXIN
		wx.chooseMessageFile(options);
		// #endif
		// #ifdef H5
		uni.chooseFile(options);
		// #endif
		// #ifndef H5
		// #ifndef MP-WEIXIN
		reject(new Error("请在 H5 或微信小程序中导入 JSON 量表"));
		// #endif
		// #endif
	});
}
