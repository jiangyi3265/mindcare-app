import fs from "node:fs/promises";
const groups = {
	AssessmentScreens: {
		"index/index": "home",
		"assessment/detail": "detail",
		"assessment/quiz": "quiz",
		"assessment/report": "report",
	},
	ConsultationScreens: {
		"consultation/index": "home",
		"consultation/booking": "booking",
	},
	CourseScreens: { "courses/index": "home", "courses/detail": "detail" },
	ActivityScreens: {
		"activities/index": "home",
		"activities/detail": "detail",
		"activities/signup": "signup",
		"activities/success": "success",
	},
	ProfileScreens: { "profile/index": "home", "profile/records": "records" },
	AdminScreens: {
		"admin/index": "home",
		"admin/scales": "scales",
		"admin/courses": "courses",
		"admin/services": "services",
	},
};
const paths = [];
for (const [component, routes] of Object.entries(groups))
	for (const [route, mode] of Object.entries(routes)) {
		const path = `pages/${route}`;
		paths.push(path);
		await fs.mkdir(path.slice(0, path.lastIndexOf("/")), {
			recursive: true,
		});
		await fs.writeFile(
			path + ".vue",
			`<template><${component} mode="${mode}" :params="params" /></template>\n<script setup>\nimport { ref } from 'vue'\nimport { onLoad } from '@dcloudio/uni-app'\nimport ${component} from '../../components/${component}.vue'\nconst params=ref({})\nonLoad(query=>{params.value=query||{}})\n</script>\n`,
		);
	}
await fs.writeFile(
	"pages.json",
	JSON.stringify(
		{
			pages: paths.map((path) => ({
				path,
				style: { navigationStyle: "custom" },
			})),
			globalStyle: {
				navigationStyle: "custom",
				backgroundColor: "#fafbf8",
				backgroundTextStyle: "dark",
				navigationBarTitleText: "心理健康服务",
				rpxCalcMaxDeviceWidth: 430,
				rpxCalcBaseDeviceWidth: 430,
			},
			uniIdRouter: {},
		},
		null,
		2,
	),
);
console.log(`Registered ${paths.length} pages`);
