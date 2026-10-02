import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isSupportAdminForDiscordId } from "@/server/support-admin";
import type { ReplyActor } from "@/server/reply-authorization";

export async function getReplyActor(): Promise<ReplyActor & { name: string | null; image: string | null }> {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || null;
    return {
        userId,
        isAdmin: await isSupportAdminForDiscordId(userId),
        name: session?.user?.name || null,
        image: session?.user?.image || null,
    };
}

