import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarSchedule, fetchCalendarDate, getGameDateString, isCalendarDate, sortGameTimes, type CalendarContent } from "../src/app/lib/calendar";
import { GET } from "../src/app/api/lostark/calendar/route";

function content(times: string[], name = "예시 섬", category = "모험 섬"): CalendarContent {
    return { CategoryName: category, ContentsName: name, ContentsIcon: "icon.png", StartTimes: times };
}

test("game dates reset at 06:00 KST, independently of local time zone", () => {
    assert.equal(getGameDateString(new Date("2026-11-10T20:59:59Z")), "2026-11-10");
    assert.equal(getGameDateString(new Date("2026-11-10T21:00:00Z")), "2026-11-11");
    assert.equal(getGameDateString(new Date("2026-01-01T01:00:00+09:00")), "2025-12-31");
    assert.ok(isCalendarDate("2028-02-29"));
    assert.ok(!isCalendarDate("2026-02-30"));
    assert.ok(!isCalendarDate("not-a-date"));
});

test("a game day includes next-day dawn, excluding both adjacent 06:00 boundaries", () => {
    const result = buildCalendarSchedule([content([
        "2026-12-31T05:59:59", "2026-12-31T06:00:00",
        "2026-12-31T23:50:00", "2027-01-01T01:00:00", "2027-01-01T06:00:00",
    ])], "2026-12-31");
    assert.deepEqual(result.islands[0].times, ["06:00", "24:00", "01:00"]);
    assert.deepEqual(buildCalendarSchedule([content(["2027-01-01T06:00:00"])], "2027-01-01").islands[0].times, ["06:00"]);
});

test("time ordering preserves minutes and places dawn after midnight", () => {
    assert.deepEqual(sortGameTimes(["01:00", "23:30", "07:00", "24:00", "23:00", "07:00"]), ["07:00", "23:00", "23:30", "24:00", "01:00"]);
});

test("duplicate island entries merge their dates and special official schedules remain visible", () => {
    const result = buildCalendarSchedule([
        content(["2026-11-11T19:00:00"]), content(["2026-11-11T11:00:00"]),
        content(["2026-11-11T17:00:00"], "보스", "필드보스"),
        content(["2026-11-11T13:00:00"], "게이트", "카오스게이트"),
    ], "2026-11-11");
    assert.equal(result.islands.length, 1);
    assert.deepEqual(result.islands[0].times, ["11:00", "19:00"]);
    assert.equal(result.hasFieldBoss, true);
    assert.equal(result.hasChaosGate, true);
    assert.equal(buildCalendarSchedule([], "2026-11-11").islands.length, 0);
});

test("a transient failure retries once, and persistent failures stay failures", async t => {
    const expected = buildCalendarSchedule([], "2026-11-10");
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => ++calls === 1 ? new Response(null, { status: 503 }) : Response.json(expected));
    assert.deepEqual(await fetchCalendarDate("2026-11-10", new AbortController().signal), expected);
    assert.equal(calls, 2);
    t.mock.restoreAll();
    calls = 0;
    t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("network down"); });
    await assert.rejects(fetchCalendarDate("2026-11-10", new AbortController().signal));
    assert.equal(calls, 2);
});

test("island details keep all rewards and deduplicate level groups and repeated entries", () => {
    const island = content(["2026-11-10T11:00:00"]);
    const rewards = Array.from({ length: 6 }, (_, index) => ({ Name: `보상 ${index}`, Icon: `${index}.png`, Grade: "희귀" }));
    island.RewardItems = [{ Items: rewards }, { Items: rewards }];
    const later = content(["2026-11-10T19:00:00"]);
    later.RewardItems = [{ Items: [{ Name: "골드", Icon: "gold.png", Grade: "일반" }] }];
    const result = buildCalendarSchedule([island, later], "2026-11-10").islands[0];
    assert.equal(result.rewardItems.length, 7);
    assert.equal(result.rewardItems[5].name, "보상 5");
    assert.equal(result.isGoldIsland, true);
    assert.deepEqual(result.times, ["11:00", "19:00"]);
});

test("a cancelled date request cannot return a late response or retry over the new date", async t => {
    let finishOld!: (response: Response) => void;
    let calls = 0;
    t.mock.method(globalThis, "fetch", async (url: string) => {
        calls++;
        if (url.includes("2026-11-10")) return new Promise<Response>(resolve => { finishOld = resolve; });
        return Response.json(buildCalendarSchedule([], "2026-11-11"));
    });
    const controller = new AbortController();
    const oldRequest = fetchCalendarDate("2026-11-10", controller.signal);
    const rejected = assert.rejects(oldRequest, { name: "AbortError" });
    controller.abort();
    const current = await fetchCalendarDate("2026-11-11", new AbortController().signal);
    finishOld(Response.json(buildCalendarSchedule([], "2026-11-10")));
    await rejected;
    assert.equal(current.targetDate, "2026-11-11");
    assert.equal(calls, 2);
});

test("a response for another date is rejected instead of appearing under the selected date", async t => {
    t.mock.method(globalThis, "fetch", async () => Response.json(buildCalendarSchedule([], "2026-11-09")));
    await assert.rejects(fetchCalendarDate("2026-11-10", new AbortController().signal));
});

test("calendar API validates dates and falls back to another key without exposing failures as empty schedules", async t => {
    const original = process.env.LOSTARK_OPENAPI_JWT;
    process.env.LOSTARK_OPENAPI_JWT = "calendar-test-first,calendar-test-second";
    t.after(() => {
        if (original === undefined) delete process.env.LOSTARK_OPENAPI_JWT;
        else process.env.LOSTARK_OPENAPI_JWT = original;
    });
    assert.equal((await GET(new Request("http://localhost/api/lostark/calendar?date=2026-02-30"))).status, 400);
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => ++calls === 1 ? new Response(null, { status: 429 }) : Response.json([content(["2026-11-10T19:00:00"])]));
    const response = await GET(new Request("http://localhost/api/lostark/calendar?date=2026-11-10"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).islands.length, 1);
    assert.equal(calls, 2);
    t.mock.restoreAll();
    t.mock.method(globalThis, "fetch", async () => Response.json({ error: "upstream unavailable" }));
    assert.equal((await GET(new Request("http://localhost/api/lostark/calendar?date=2026-11-10"))).status, 502);
});
