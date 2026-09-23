const configuredBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API_BASE = configuredBase.replace(/\/$/, "");

function request(path, options = {}) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${API_BASE}${path}`,
			method: options.method || "GET",
			data: options.data,
			header: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
			timeout: 10000,
			success(response) {
				const body = response.data || {};
				if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 200) {
					resolve(body.data);
					return;
				}
				reject(new Error(body.msg || `服务请求失败（${response.statusCode}）`));
			},
			fail(error) {
				reject(new Error(error.errMsg || "暂时无法连接服务"));
			},
		});
	});
}

const identityHeaders = (identity) => ({
	"X-Client-Id": identity.clientId,
	"X-Client-Token": identity.token,
});

export const registerClient = (identity, profile) =>
	request("/app/mindcare/client/register", {
		method: "POST",
		data: { ...identity, nickname: profile?.name || "", phone: profile?.phone || "" },
	});

export const fetchBootstrap = (identity) =>
	request("/app/mindcare/bootstrap", { headers: identityHeaders(identity) });

export const saveRecord = (identity, record) =>
	request("/app/mindcare/records", {
		method: "POST",
		headers: identityHeaders(identity),
		data: record,
	});

export const clearRecords = (identity) =>
	request("/app/mindcare/records", {
		method: "DELETE",
		headers: identityHeaders(identity),
	});
