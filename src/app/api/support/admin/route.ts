import { NextResponse } from "next/server";
import { isSupportAdmin } from "@/server/support-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json(
        { isAdmin: await isSupportAdmin() },
        { headers: { "Cache-Control": "no-store" } }
    );
}
