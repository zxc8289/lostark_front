import crypto from "crypto";

export type ReplyActor = { userId: string | null; isAdmin: boolean };

export function createGuestReplyKey() {
    const key = crypto.randomBytes(32).toString("base64url");
    return { key, hash: hashReplyKey(key) };
}

function hashReplyKey(key: string) {
    return crypto.createHash("sha256").update(key).digest("hex");
}

export function canManageReply(reply: Record<string, unknown>, actor: ReplyActor, key?: string | null) {
    if (reply.isDeleted === true) return false;
    if (actor.isAdmin) return true;
    if (reply.isStaff === true) return false;
    if (actor.userId && reply.authorId === actor.userId) return true;

    if (typeof reply.editKeyHash === "string" && key && /^[A-Za-z0-9_-]{43}$/.test(key)) {
        const stored = Buffer.from(reply.editKeyHash, "hex");
        const provided = Buffer.from(hashReplyKey(key), "hex");
        return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
    }
    return false;
}
