"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UsersRound } from "lucide-react";
import { getPartyGroupHref, type PartyRaidAssignment } from "@/app/lib/tasks/party-assignments";

function assignmentDetail({ groupName, difficulty, mode }: PartyRaidAssignment) {
  const group = mode === "temp_planner" && !groupName.includes("자율편성")
    ? `자율편성 · ${groupName}`
    : groupName;
  return `${group}${difficulty ? ` · ${difficulty}` : ""}`;
}

export default function PartyAssignmentLabel({
  assignments,
  compact = false,
}: {
  assignments: PartyRaidAssignment[];
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnScroll = () => setIsOpen(false);

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [isOpen]);

  if (assignments.length === 0) return null;

  const description = assignments
    .map((assignment) => `${assignment.external && assignment.partyName !== "다른 공격대" ? "다른 공격대: " : ""}${assignment.partyName} · ${assignmentDetail(assignment)}`)
    .join(" / ");
  const externalOnly = assignments.every((assignment) => assignment.external);

  const onTriggerClick = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 264));
    setPosition(rect.bottom < window.innerHeight / 2
      ? { left, top: rect.bottom + 8 }
      : { left, bottom: window.innerHeight - rect.top + 8 });
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={`파티 편성: ${description}`}
        aria-label={`파티 편성: ${description}, 그룹 목록 보기`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={onTriggerClick}
        className={compact
          ? `inline-flex h-5 w-5 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 ${externalOnly ? "text-amber-300 hover:bg-amber-300/10 hover:text-amber-200 focus-visible:outline-amber-300" : "text-emerald-300 hover:bg-emerald-300/10 hover:text-emerald-200 focus-visible:outline-emerald-300"}`
          : `inline-flex max-w-[120px] min-w-0 items-center gap-1 rounded text-[11px] hover:underline focus-visible:outline focus-visible:outline-2 ${externalOnly ? "text-amber-300 focus-visible:outline-amber-300" : "text-emerald-300 focus-visible:outline-emerald-300"}`}
      >
        <UsersRound className={compact ? "h-3.5 w-3.5" : "h-3 w-3 shrink-0"} aria-hidden="true" />
        {!compact && (
          <>
            <span className="min-w-0 truncate">{assignments[0].partyName}</span>
            {assignments.length > 1 && <span className="shrink-0">+{assignments.length - 1}</span>}
          </>
        )}
      </button>
      {isOpen && position && createPortal(
        <div
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-label="편성된 그룹 목록"
          style={{ position: "fixed", ...position, width: "min(256px, calc(100vw - 16px))" }}
          className="z-[200] max-h-[50vh] overflow-y-auto rounded-xl border border-white/15 bg-[#242831] p-2.5 text-left text-xs text-gray-200 shadow-xl"
        >
          <div className={`px-1 pb-2 pt-0.5 text-[13px] font-bold ${externalOnly ? "text-amber-300" : "text-emerald-300"}`}>파티 편성</div>
          <div className="space-y-1.5">
            {assignments.map((assignment, index) => {
              const href = getPartyGroupHref(assignment);
              const content = (
                <>
                  <span className="block text-[12px] font-semibold leading-4 text-white">{assignment.external && assignment.partyName !== "다른 공격대" ? "다른 공격대: " : ""}{assignment.partyName}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-gray-400">{assignmentDetail(assignment)}</span>
                </>
              );
              return href ? (
                <a
                  key={`${assignment.partyId}-${assignment.groupId}-${index}`}
                  href={href}
                  className="block break-words rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-2 transition-colors hover:border-white/15 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
                >
                  {content}
                </a>
              ) : (
                <div key={`${assignment.partyId}-${assignment.groupName}-${index}`} className="break-words rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-2">
                  {content}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
