// app/components/tasks/PartySettingsModal.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
    Settings,
    X,
    Crown,
    UserX,
    Loader2,
    Calendar,
    Shield,
    Users,
    Swords,
    ChevronDown,
    Check,
} from "lucide-react";

type PartySettingsMember = {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
};

type PartySettingsModalProps = {
    open: boolean;
    onClose: () => void;
    party: {
        id: number;
        name: string;
        memo: string | null;
        ownerId: string;
        createdAt: string;
        myRole: string;
        raidCount: number;
        nextResetAt: string | null;
        members: PartySettingsMember[];
    };
    myUserId?: string | null;
    myRemainingRaids?: number;
    onPartyUpdated?: (patch: {
        name?: string;
        ownerId?: string;
        members?: PartySettingsMember[];
    }) => void;
    onMemberKicked?: (userId: string) => void;
};


export default function PartySettingsModal({
    open,
    onClose,
    party,
    myUserId,
    myRemainingRaids,
    onPartyUpdated,
    onMemberKicked,
}: PartySettingsModalProps) {
    const [name, setName] = useState(party.name);
    const [ownerId, setOwnerId] = useState(party.ownerId);
    const [members, setMembers] = useState<PartySettingsMember[]>(
        party.members ?? []
    );

    const [saving, setSaving] = useState(false);
    const [savingError, setSavingError] = useState<string | null>(null);

    const [kickLoadingId, setKickLoadingId] = useState<string | null>(null);
    const [kickError, setKickError] = useState<string | null>(null);

    // 드롭다운 상태 관리
    const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getRoleLabel = (role?: string | null) => {
        if (!role) return "-";
        if (role === "owner") return "파티장";
        if (role === "member") return "파티원";
        return role; // 혹시 다른 값이 들어오면 그대로 표시
    };


    useEffect(() => {
        setName(party.name);
        setOwnerId(party.ownerId);
        setMembers(party.members ?? []);
    }, [party]);

    // 바깥 클릭 감지 (드롭다운 닫기)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOwnerDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!open) return null;

    const canManage = !!myUserId && myUserId === party.ownerId;

    const leaderMember =
        members.find((m) => m.id === ownerId) ??
        members.find((m) => m.id === party.ownerId) ??
        null;

    const handleSave = async () => {
        if (!canManage) return;

        const trimmed = name.trim();
        if (!trimmed) {
            setSavingError("파티 이름을 입력해주세요.");
            return;
        }

        setSaving(true);
        setSavingError(null);
        try {
            const res = await fetch(`/api/party-tasks/${party.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmed,
                    ownerId,
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "파티 설정을 저장하지 못했습니다.");
            }

            onPartyUpdated?.({
                name: trimmed,
                ownerId,
            });
        } catch (e: any) {
            setSavingError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleKickMember = async (member: PartySettingsMember) => {
        if (!canManage) return;

        if (member.id === ownerId || (myUserId && member.id === myUserId)) {
            return;
        }

        if (
            typeof window !== "undefined" &&
            !window.confirm(
                `${member.name ?? "이 파티원"}을(를) 정말 강퇴하시겠습니까?`
            )
        ) {
            return;
        }

        setKickError(null);
        setKickLoadingId(member.id);

        try {
            const res = await fetch(`/api/party-tasks/${party.id}/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: member.id }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "파티원을 강퇴하지 못했습니다.");
            }

            const updated = members.filter((m) => m.id !== member.id);
            setMembers(updated);
            onPartyUpdated?.({ members: updated });
            onMemberKicked?.(member.id);
        } catch (e: any) {
            setKickError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setKickLoadingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg overflow-visible rounded-2xl bg-[#1a1c23] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#5B69FF]/10 to-transparent pointer-events-none rounded-t-2xl" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#5B69FF]/20 text-[#5B69FF]">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                파티 관리
                            </h2>
                            {canManage && (
                                <p className="text-xs text-gray-400 font-medium">
                                    멤버 및 파티 정보를 수정합니다.
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="px-6 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Section: Basic Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-5">
                            {/* 파티 이름 Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 ml-1">
                                    파티 이름
                                </label>
                                {canManage ? (
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-11 rounded-xl bg-black/20 border border-white/10 px-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#5B69FF]/50 focus:ring-1 focus:ring-[#5B69FF]/50 transition-all"
                                        placeholder="파티 이름을 입력하세요"
                                        maxLength={50}
                                    />
                                ) : (
                                    <div className="w-full h-11 flex items-center px-4 rounded-xl bg-white/5 border border-white/5 text-sm text-white font-medium">
                                        {party.name}
                                    </div>
                                )}
                            </div>

                            {/* 커스텀 파티장 드롭다운 */}
                            <div className="space-y-1.5 relative" ref={dropdownRef}>
                                <label className="text-xs font-semibold text-gray-400 ml-1 flex items-center gap-1">
                                    파티장 <Crown className="w-3 h-3 text-amber-400" />
                                </label>
                                {canManage ? (
                                    <div className="relative">
                                        {/* Trigger Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
                                            className={`w-full h-11 flex items-center justify-between px-4 rounded-xl border text-sm text-white transition-all ${isOwnerDropdownOpen
                                                ? "bg-black/30 border-[#5B69FF]/50 ring-1 ring-[#5B69FF]/50"
                                                : "bg-black/20 border-white/10 hover:bg-black/30 hover:border-white/20"
                                                }`}
                                        >
                                            <span className="truncate">
                                                {members.find((m) => m.id === ownerId)?.name ||
                                                    "선택 안됨"}
                                            </span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOwnerDropdownOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isOwnerDropdownOpen && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-2 p-1 bg-[#1E2028] border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                                {members.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setOwnerId(m.id);
                                                            setIsOwnerDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${ownerId === m.id
                                                            ? "bg-[#5B69FF]/20 text-[#8FA6FF]"
                                                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            {/* Small Avatar in Dropdown */}
                                                            <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 overflow-hidden shrink-0">
                                                                {m.image ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={m.image}
                                                                        alt=""
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    (m.name || "?").slice(0, 1)
                                                                )}
                                                            </div>
                                                            <span className="truncate">{m.name}</span>
                                                        </div>
                                                        {ownerId === m.id && (
                                                            <Check className="w-4 h-4 text-[#5B69FF]" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Read-only view for non-managers
                                    <div className="w-full h-11 flex items-center gap-2 px-4 rounded-xl bg-white/5 border border-white/5 text-sm text-white">
                                        <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 overflow-hidden shrink-0">
                                            {leaderMember?.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={leaderMember.image}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                (leaderMember?.name || "?").slice(0, 1)
                                            )}
                                        </div>
                                        <span className="text-amber-400 font-medium text-xs border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                            파티장
                                        </span>
                                        <span className="truncate">
                                            {leaderMember?.name ?? "알 수 없음"}
                                        </span>
                                    </div>
                                )}
                                {!canManage && (
                                    <p className="text-[11px] text-gray-500 pl-1">
                                        * 파티장만 설정을 변경할 수 있습니다.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 메모 */}
                        {party.memo && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 ml-1">
                                    메모
                                </label>
                                <div className="w-full p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                    {party.memo}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Shield className="w-3.5 h-3.5" />내 역할
                            </div>
                            <div className="text-sm font-semibold text-white truncate">
                                {getRoleLabel(party.myRole)}
                            </div>

                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Swords className="w-3.5 h-3.5" /> 레이드
                            </div>
                            <div className="text-sm font-semibold text-white">
                                {typeof myRemainingRaids === "number"
                                    ? `${myRemainingRaids}개`
                                    : "-"}
                            </div>
                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Calendar className="w-3.5 h-3.5" /> 생성일
                            </div>
                            <div className="text-xs font-medium text-gray-200 truncate">
                                {party.createdAt}
                            </div>
                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Users className="w-3.5 h-3.5" /> 인원
                            </div>
                            <div className="text-sm font-semibold text-white">
                                {members.length}명
                            </div>
                        </div>
                    </div>

                    {/* Section: Members List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                파티원 목록
                            </h3>
                            <span className="text-xs text-gray-500">
                                {members.length}명 참여 중
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {members.length === 0 && (
                                <div className="text-center py-6 text-sm text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    파티원이 없습니다.
                                </div>
                            )}
                            {members.map((m) => {
                                const isLeader = m.id === ownerId;
                                const isSelf = myUserId && m.id === myUserId;
                                const canKickThis = canManage && !isLeader && !isSelf;

                                return (
                                    <div
                                        key={m.id}
                                        className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* Avatar */}
                                            <div className="relative h-10 w-10 shrink-0 rounded-full bg-[#2a2d36] border border-white/10 overflow-hidden flex items-center justify-center text-xs text-gray-300">
                                                {m.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={m.image}
                                                        alt={m.name || ""}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    (m.name || "?").slice(0, 1)
                                                )}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-medium text-white truncate max-w-[120px] sm:max-w-[150px]">
                                                        {m.name || "이름 없음"}
                                                    </span>
                                                    {isSelf && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5B69FF]/20 text-[#8FA6FF]">
                                                            나
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {isLeader && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                                                            <Crown className="w-3 h-3 fill-amber-400/20" />{" "}
                                                            파티장
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        {canKickThis && (
                                            <button
                                                type="button"
                                                onClick={() => handleKickMember(m)}
                                                disabled={kickLoadingId === m.id}
                                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                                                title="추방하기"
                                            >
                                                {kickLoadingId === m.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <span className="text-xs font-medium">추방</span>
                                                        <UserX className="h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {kickError && (
                            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
                                {kickError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-[#17191f] rounded-b-2xl shrink-0">
                    <div className="flex-1 min-w-0">
                        {savingError && (
                            <p className="text-xs text-red-400 truncate animate-in slide-in-from-left-2">
                                ⚠️ {savingError}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            취소
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#5B69FF] hover:bg-[#4a57e0] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#5B69FF]/20 hover:shadow-[#5B69FF]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                저장하기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}