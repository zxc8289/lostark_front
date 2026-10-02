import { deleteReply, updateReply } from "@/server/reply-mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; replyId: string }> };

export async function PATCH(req: Request, { params }: Context) {
    const { id, replyId } = await params;
    return updateReply(req, { postId: id, replyId }, "notice");
}

export async function DELETE(req: Request, { params }: Context) {
    const { id, replyId } = await params;
    return deleteReply(req, { postId: id, replyId }, "notice");
}
