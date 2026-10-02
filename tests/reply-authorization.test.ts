import assert from "node:assert/strict";
import test from "node:test";
import { canManageReply, createGuestReplyKey } from "../src/server/reply-authorization";

const admin = { userId: "admin-id", isAdmin: true };
const author = { userId: "author-id", isAdmin: false };
const other = { userId: "other-id", isAdmin: false };
const guest = { userId: null, isAdmin: false };

test("an admin can manage old comments and official replies", () => {
    assert.equal(canManageReply({ isStaff: false }, admin), true);
    assert.equal(canManageReply({ isStaff: true }, admin), true);
    assert.equal(canManageReply({ isStaff: false }, author), false);
});

test("a signed-in author can manage only their own ordinary comments", () => {
    const reply = { authorId: "author-id", isStaff: false };
    assert.equal(canManageReply(reply, author), true);
    assert.equal(canManageReply(reply, other), false);
    assert.equal(canManageReply({ ...reply, isStaff: true }, author), false);
});

test("a guest comment requires the matching edit key", () => {
    const { key, hash } = createGuestReplyKey();
    const reply = { editKeyHash: hash, isStaff: false };
    assert.equal(canManageReply(reply, guest), false);
    assert.equal(canManageReply(reply, guest, "wrong"), false);
    assert.equal(canManageReply(reply, guest, key), true);
});

test("deleted comments cannot be edited or deleted again", () => {
    const reply = { authorId: "author-id", isDeleted: true };
    assert.equal(canManageReply(reply, admin), false);
    assert.equal(canManageReply(reply, author), false);
});
