import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export async function isSupportAdmin(): Promise<boolean> {
    const session = await getServerSession(authOptions);
    const discordId = (session?.user as { id?: string } | undefined)?.id;
    return isSupportAdminForDiscordId(discordId);
}

export async function isSupportAdminForDiscordId(discordId?: string | null): Promise<boolean> {
    if (!discordId) return false;

    const db = await getDb();
    const user = await db.collection("users").findOne(
        { id: discordId, role: "admin" },
        { projection: { _id: 1 } }
    );
    return user !== null;
}
