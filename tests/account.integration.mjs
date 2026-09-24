import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

if (process.env.MINDCARE_ISOLATED_TEST_DB !== "1") {
  throw new Error("Account integration test requires MINDCARE_ISOLATED_TEST_DB=1");
}
const base = process.env.MINDCARE_API_URL || "http://127.0.0.1:18080";
if (new URL(base).hostname !== "127.0.0.1") {
  throw new Error("Account integration test must never target a public server");
}
const json = async (path, { method = "GET", identity, expectedAccountId, data } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(identity ? { "X-Client-Id": identity.clientId, "X-Client-Token": identity.token } : {}),
      ...(expectedAccountId ? { "X-Expected-Account-Id": String(expectedAccountId) } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  return response.json();
};
const ok = async (path, options) => {
  const result = await json(path, options);
  assert.equal(result.code, 200, `${path}: ${result.msg}`);
  return result.data;
};
const reject = async (path, options) => {
  const result = await json(path, options);
  assert.notEqual(result.code, 200, `${path} should have failed`);
};
const newClient = async () => {
  const identity = {
    clientId: `mc_test_${randomBytes(12).toString("hex")}`,
    token: randomBytes(32).toString("hex"),
  };
  await ok("/app/mindcare/client/register", { method: "POST", data: identity });
  return identity;
};
const phone = `139${randomBytes(4).readUInt32BE(0).toString().padStart(8, "0").slice(0, 8)}`;
const otherPhone = `138${randomBytes(4).readUInt32BE(0).toString().padStart(8, "0").slice(0, 8)}`;
const password = `Mindcare${randomBytes(6).toString("hex")}`;
const newPassword = `Updated${randomBytes(6).toString("hex")}`;
const first = await newClient();
const second = await newClient();
const third = await newClient();
const recordKey = `account-test-${randomBytes(7).toString("hex")}`;

await ok("/app/mindcare/records", {
  method: "POST", identity: first,
  data: { recordKey, recordType: "message", title: "账号归属联调", dataJson: JSON.stringify({ text: "仅隔离库测试", id: recordKey }) },
});
await reject("/app/mindcare/account/register", {
  method: "POST", identity: first, data: { phone, password: "weak", nickname: "测试用户" },
});
const registered = await ok("/app/mindcare/account/register", {
  method: "POST", identity: first, data: { phone, password, nickname: "测试用户" },
});
assert.match(registered.recoveryCode, /^[A-F0-9-]{39}$/);
assert.equal((await ok("/app/mindcare/bootstrap", { identity: first })).records.length, 1);
console.log("PASS register and guest-record migration");

await reject("/app/mindcare/account/login", {
  method: "POST", identity: second, data: { phone, password: "Wrong1234" },
});
await ok("/app/mindcare/account/login", {
  method: "POST", identity: second, data: { phone, password },
});
assert.equal((await ok("/app/mindcare/bootstrap", { identity: second })).records[0].recordKey, recordKey);
const secondRecordKey = `account-test-${randomBytes(7).toString("hex")}`;
await ok("/app/mindcare/records", {
  method: "POST", identity: second, expectedAccountId: registered.accountId,
  data: { recordKey: secondRecordKey, recordType: "message", title: "跨设备记录", dataJson: JSON.stringify({ text: "第二台设备", id: secondRecordKey }) },
});
const makeKey = () => `account-test-${randomBytes(7).toString("hex")}`;
const assessmentKey = makeKey();
await ok("/app/mindcare/records", {
  method: "POST", identity: first,
  data: { recordKey: assessmentKey, recordType: "assessment", contentKey: "stress", dataJson: JSON.stringify({ id: assessmentKey, scaleId: "stress", answers: Array(10).fill(1) }) },
});
const courseKey = makeKey();
await ok("/app/mindcare/records", {
  method: "POST", identity: second,
  data: { recordKey: courseKey, recordType: "course", contentKey: "breath", progress: 40, dataJson: JSON.stringify({ id: courseKey, percent: 40 }) },
});
const bookingKey = makeKey();
const bookingData = { id: bookingKey, date: "2026-10-01", time: "10:00", name: "测试用户", phone: "13800138000" };
await ok("/app/mindcare/records", {
  method: "POST", identity: first,
  data: { recordKey: bookingKey, recordType: "consultation", contactName: "测试用户", contactPhone: "13800138000", dataJson: JSON.stringify(bookingData) },
});
await reject("/app/mindcare/records", {
  method: "POST", identity: second,
  data: { recordKey: makeKey(), recordType: "consultation", contactName: "测试用户", contactPhone: "13800138000", dataJson: JSON.stringify(bookingData) },
});
const activityKey = makeKey();
const activityData = { id: activityKey, eventId: "forest", count: 1, emergency: "家人 13800138000", name: "测试用户", phone: "13800138000" };
await ok("/app/mindcare/records", {
  method: "POST", identity: first,
  data: { recordKey: activityKey, recordType: "activity", contentKey: "forest", contactName: "测试用户", contactPhone: "13800138000", dataJson: JSON.stringify(activityData) },
});
await reject("/app/mindcare/records", {
  method: "POST", identity: second,
  data: { recordKey: makeKey(), recordType: "activity", contentKey: "forest", contactName: "测试用户", contactPhone: "13800138000", dataJson: JSON.stringify(activityData) },
});
const shared = await ok("/app/mindcare/bootstrap", { identity: first });
assert.equal(shared.records.length, 6);
assert.deepEqual(new Set(shared.records.map(row => row.recordType)), new Set(["message", "assessment", "course", "consultation", "activity"]));
console.log("PASS cross-device account records and five business types");

await ok("/app/mindcare/account/register", {
  method: "POST", identity: third, data: { phone: otherPhone, password, nickname: "另一账号" },
});
assert.equal((await ok("/app/mindcare/bootstrap", { identity: third })).records.length, 0);
await reject("/app/mindcare/bootstrap", { identity: { clientId: first.clientId, token: third.token } });
console.log("PASS account isolation and credential rejection");

await ok("/app/mindcare/account/logout", { method: "POST", identity: first });
await reject("/app/mindcare/bootstrap", { identity: first });
assert.equal((await ok("/app/mindcare/bootstrap", { identity: second })).records.length, 6);
const fourth = await newClient();
await reject("/app/mindcare/account/recover", {
  method: "POST", identity: fourth, data: { phone, recoveryCode: "0000-0000-0000-0000-0000-0000-0000-0000", newPassword },
});
const recovered = await ok("/app/mindcare/account/recover", {
  method: "POST", identity: fourth, data: { phone, recoveryCode: registered.recoveryCode, newPassword },
});
assert.notEqual(recovered.recoveryCode, registered.recoveryCode);
assert.equal((await ok("/app/mindcare/bootstrap", { identity: fourth })).records.length, 6);
const stale = await ok("/app/mindcare/bootstrap", { identity: second });
assert.equal(stale.account, null);
assert.equal(stale.records.length, 0);
await reject("/app/mindcare/records", {
  method: "POST", identity: second, expectedAccountId: registered.accountId,
  data: { recordKey: makeKey(), recordType: "message", dataJson: JSON.stringify({ text: "过期会话不能写入" }) },
});
console.log("PASS logout, one-time recovery and old-session revocation");

const fifth = await newClient();
await reject("/app/mindcare/account/login", { method: "POST", identity: fifth, data: { phone, password } });
await ok("/app/mindcare/account/login", { method: "POST", identity: fifth, data: { phone, password: newPassword } });
await ok("/app/mindcare/account/profile", { method: "PUT", identity: fifth, data: { nickname: "新的昵称" } });
assert.equal((await ok("/app/mindcare/bootstrap", { identity: fourth })).account.nickname, "新的昵称");
await reject("/app/mindcare/account/recover", {
  method: "POST", identity: fifth, data: { phone, recoveryCode: registered.recoveryCode, newPassword },
});
console.log("PASS password change, profile sync and consumed recovery code");
await ok("/app/mindcare/records", { method: "DELETE", identity: fifth, expectedAccountId: registered.accountId });
assert.equal((await ok("/app/mindcare/bootstrap", { identity: fourth })).records.length, 0);
console.log("PASS account-wide record deletion");
