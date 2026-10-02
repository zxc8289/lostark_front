import assert from "node:assert/strict";
import test from "node:test";
import type { Db } from "mongodb";
import { createAdminAlerts } from "../src/server/admin-alerts";

test("a new user event creates an unread alert for every admin", async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const db = {
        collection(name: string) {
            if (name === "users") {
                return { find: () => ({ toArray: async () => [{ id: "admin-one" }, { id: "admin-two" }] }) };
            }
            if (name === "admin_alerts") {
                return { insertMany: async (rows: Array<Record<string, unknown>>) => { inserted.push(...rows); } };
            }
            throw new Error(`Unexpected collection: ${name}`);
        },
    } as unknown as Db;

    await createAdminAlerts(db, {
        type: "support_comment",
        sourceId: "reply-id",
        postId: "post-id",
        postTitle: "문의 제목",
    });

    assert.equal(inserted.length, 2);
    assert.deepEqual(inserted.map((row) => row.recipientId), ["admin-one", "admin-two"]);
    assert.ok(inserted.every((row) => row.type === "support_comment" && row.readAt === null));
    assert.ok(inserted.every((row) => row.createdAt instanceof Date));
});
