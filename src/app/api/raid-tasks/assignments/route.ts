import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";
import type { PartyRaidAssignments } from "@/app/lib/tasks/party-assignments";

export const runtime = "nodejs";

type RaidGroup = {
  id?: string;
  raidName?: string;
  groupName?: string;
  difficulty?: string;
  expiresAt?: number;
  slots?: Array<{ ownerId?: string; name?: string; isGuest?: boolean } | null>;
};

type PartyDoc = {
  id: number;
  name?: string;
  planner_data?: RaidGroup[];
  temp_planner_data?: RaidGroup[];
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const memberships = await db.collection<{ party_id: number; user_id: string }>("party_members")
      .find({ user_id: userId }, { projection: { party_id: 1 } })
      .toArray();
    const partyIds = [...new Set(memberships.map((member) => member.party_id))];
    const assignments: PartyRaidAssignments = {};

    if (partyIds.length === 0) return NextResponse.json({ assignments });

    const parties = await db.collection<PartyDoc>("parties")
      .find({ id: { $in: partyIds } }, { projection: { _id: 0, id: 1, name: 1, planner_data: 1, temp_planner_data: 1 } })
      .toArray();
    const now = Date.now();

    for (const party of parties) {
      const groupSets = [
        { groups: party.planner_data, mode: "planner", fallbackName: "레이드 그룹" },
        { groups: party.temp_planner_data, mode: "temp_planner", fallbackName: "자율편성 그룹" },
      ] as const;
      for (const { groups: rawGroups, mode, fallbackName } of groupSets) {
        const raidGroups = Array.isArray(rawGroups) ? rawGroups : [];
        for (const group of raidGroups) {
          if (!group.raidName || !Array.isArray(group.slots)) continue;
          if (group.expiresAt && group.expiresAt <= now) continue;

          for (const slot of group.slots) {
            if (!slot || slot.isGuest || slot.ownerId !== userId || !slot.name) continue;
            const raids = assignments[slot.name] ??= {};
            const groups = raids[group.raidName] ??= [];
            groups.push({
              partyId: party.id,
              partyName: party.name || "이름 없는 공격대",
              groupId: group.id,
              groupName: group.groupName || fallbackName,
              difficulty: group.difficulty || "",
              mode,
            });
          }
        }
      }
    }

    return NextResponse.json({ assignments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Raid assignment load failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
