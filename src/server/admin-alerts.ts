import type { Db } from "mongodb";

export type AdminAlertType = "notice_comment" | "support_post" | "support_comment";

type NewAdminAlert = {
    type: AdminAlertType;
    sourceId: string;
    postId: string;
    postTitle: string;
};

export async function createAdminAlerts(db: Db, alert: NewAdminAlert) {
    try {
        const admins = await db.collection("users")
            .find({ role: "admin", id: { $type: "string" } }, { projection: { id: 1 } })
            .toArray();
        if (admins.length === 0) return;

        const createdAt = new Date();
        await db.collection("admin_alerts").insertMany(
            admins.map((admin) => ({
                recipientId: admin.id as string,
                ...alert,
                createdAt,
                readAt: null,
            }))
        );
    } catch (error) {
        // 알림 저장 장애가 댓글이나 게시글 등록을 중복 시도하게 만들지 않도록 한다.
        console.error("[Admin Alerts] Failed to create notifications:", error);
    }
}
