export type PartyRaidAssignment = {
  partyId: number;
  partyName: string;
  groupId?: string;
  groupName: string;
  difficulty: string;
  mode?: "planner" | "temp_planner";
  external?: boolean;
};

export type PartyRaidAssignments = Record<string, Record<string, PartyRaidAssignment[]>>;

export function getPartyGroupHref(assignment: PartyRaidAssignment): string | null {
  if (!assignment.partyId || !assignment.groupId || !assignment.mode) return null;
  const query = new URLSearchParams({ tab: assignment.mode, group: assignment.groupId });
  return `/party-tasks/${assignment.partyId}?${query.toString()}`;
}
