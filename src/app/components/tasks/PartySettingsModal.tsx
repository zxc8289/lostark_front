// src/app/components/tasks/PartySettingsModal.tsx
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
    AlertTriangle,
    GripVertical,
    Menu,
    ArrowUpDown, // 드래그 핸들 아이콘
} from "lucide-react";
import { useRouter } from "next/navigation";

// 파티원 타입
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
    // 파티 정보 업데이트 (서버 저장용)
    onPartyUpdated?: (patch: {
        name?: string;
        ownerId?: string;
        members?: PartySettingsMember[];
    }) => void;
    onMemberKicked?: (userId: string) => void;
    // ✨ [추가] 로컬 순서 변경 시 부모에게 알림
    onLocalOrderChange?: () => void;
};

export default function PartySettingsModal({
    open,
    onClose,
    party,
    myUserId,
    myRemainingRaids,
    onPartyUpdated,
    onMemberKicked,
    onLocalOrderChange,
}: PartySettingsModalProps) {
    const router = useRouter();

    const [name, setName] = useState(party.name);
    const [ownerId, setOwnerId] = useState(party.ownerId);

    // 원본 멤버 리스트 (DB 데이터)
    const [members, setMembers] = useState<PartySettingsMember[]>(party.members ?? []);

    // ✨ 화면에 보여줄 정렬된 멤버 리스트 (로컬 상태)
    const [orderedMembers, setOrderedMembers] = useState<PartySettingsMember[]>([]);

    const [saving, setSaving] = useState(false);
    const [savingError, setSavingError] = useState<string | null>(null);

    const [kickLoadingId, setKickLoadingId] = useState<string | null>(null);
    const [kickError, setKickError] = useState<string | null>(null);

    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [leaveError, setLeaveError] = useState<string | null>(null);

    const [memberToKick, setMemberToKick] = useState<PartySettingsMember | null>(null);

    const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ✨ 드래그 앤 드롭 관련 상태
    const dragItem = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const getRoleLabel = (role?: string | null) => {
        if (!role) return "-";
        if (role === "owner") return "파티장";
        if (role === "member") return "파티원";
        return role;
    };

    // 초기화 및 로컬 저장소에서 순서 불러오기
    useEffect(() => {
        setName(party.name);
        setOwnerId(party.ownerId);
        setMembers(party.members ?? []);

        // 1. 내 계정 찾기
        const myMember = party.members.find(m => m.id === myUserId);
        // 2. 나머지 멤버들
        let otherMembers = party.members.filter(m => m.id !== myUserId);

        // 3. 로컬 스토리지에서 순서 가져오기
        if (typeof window !== "undefined") {
            try {
                const savedOrder = localStorage.getItem(`partyMemberOrder:${party.id}`);
                if (savedOrder) {
                    const orderIds = JSON.parse(savedOrder) as string[];
                    // 저장된 순서대로 정렬 (없는 멤버는 뒤로)
                    otherMembers.sort((a, b) => {
                        const indexA = orderIds.indexOf(a.id);
                        const indexB = orderIds.indexOf(b.id);
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    });
                }
            } catch (e) {
                console.error("순서 불러오기 실패", e);
            }
        }

        // 내가 맨 위, 나머지는 순서대로
        if (myMember) {
            setOrderedMembers([myMember, ...otherMembers]);
        } else {
            setOrderedMembers([...otherMembers]);
        }

    }, [party, myUserId]);

    // 모달 스크롤 제어
    useEffect(() => {
        if (!open) return;
        const body = document.body;
        const scrollY = window.scrollY;
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.width = "100%";
        return () => {
            body.style.overflow = "";
            body.style.position = "";
            body.style.top = "";
            body.style.width = "";
            window.scrollTo(0, scrollY);
        };
    }, [open]);

    // 드롭다운 외부 클릭
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOwnerDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!open) return null;

    const canManage = !!myUserId && myUserId === party.ownerId;
    const canLeave = !!myUserId;
    const leaderMember = members.find((m) => m.id === ownerId) ?? members.find((m) => m.id === party.ownerId) ?? null;

    // ✨ 드래그 시작
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
    };

    // ✨ 드래그 중 (타겟 위치만 기록하고, 배열은 안 바꿈)
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        // 내 위치(0번)로는 이동 불가 표시
        if (position === 0) return;
        setDragOverIndex(position);
    };

    // ✨ 드롭 (마우스를 놓았을 때만 실제 맞교환 수행)
    const handleDragEnd = () => {
        const start = dragItem.current;
        const end = dragOverIndex;

        // 유효하지 않은 이동이면 초기화하고 종료
        if (start === null || end === null || start === end || end === 0) {
            dragItem.current = null;
            setDragOverIndex(null);
            return;
        }

        // 🔹 여기서 맞교환(Swap) 수행
        const newList = [...orderedMembers];
        const temp = newList[start];
        newList[start] = newList[end];
        newList[end] = temp;

        setOrderedMembers(newList);

        // 로컬 스토리지 저장
        const othersIds = newList
            .filter(m => m.id !== myUserId)
            .map(m => m.id);

        localStorage.setItem(`partyMemberOrder:${party.id}`, JSON.stringify(othersIds));

        // 상태 초기화 및 부모 알림
        dragItem.current = null;
        setDragOverIndex(null);
        onLocalOrderChange?.();
    };

    // 서버 저장 (파티 설정)
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
                body: JSON.stringify({ name: trimmed, ownerId }),
            });

            if (!res.ok) throw new Error(await res.text() || "파티 설정을 저장하지 못했습니다.");

            onPartyUpdated?.({ name: trimmed, ownerId });
            // 저장 성공 시에도 모달을 닫지 않고 토스트 등을 띄우는게 좋지만 여기선 닫습니다.
            onClose();
        } catch (e: any) {
            setSavingError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // 파티 나가기
    const handleLeaveClick = () => {
        if (!canLeave) return;
        setLeaveError(null);
        setLeaveConfirmOpen(true);
    };

    const confirmLeave = async () => {
        if (!myUserId) return;
        setLeaveLoading(true);
        setLeaveError(null);
        try {
            const res = await fetch(`/api/party-tasks/${party.id}/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error((await res.text()) || "파티 나가기에 실패했습니다.");
            onClose?.();
            router.push("/party-tasks");
        } catch (e: any) {
            setLeaveError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setLeaveLoading(false);
            setLeaveConfirmOpen(false);
        }
    };

    // 추방 로직
    const handleKickClick = (member: PartySettingsMember) => {
        if (!canManage) return;
        if (member.id === ownerId || (myUserId && member.id === myUserId)) return;
        setMemberToKick(member);
    };

    const confirmKick = async () => {
        if (!memberToKick) return;
        const targetMember = memberToKick;
        setMemberToKick(null);
        setKickError(null);
        setKickLoadingId(targetMember.id);
        try {
            const res = await fetch(`/api/party-tasks/${party.id}/kick`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: targetMember.id }),
            });
            if (!res.ok) throw new Error(await res.text() || "파티원을 강퇴하지 못했습니다.");

            // 멤버 목록 업데이트
            const updated = members.filter((m) => m.id !== targetMember.id);
            setMembers(updated);
            setOrderedMembers(prev => prev.filter(m => m.id !== targetMember.id)); // 화면 목록도 업데이트
            onPartyUpdated?.({ members: updated });
            onMemberKicked?.(targetMember.id);
        } catch (e: any) {
            setKickError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setKickLoadingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#1a1c23] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#5B69FF]/10 to-transparent pointer-events-none" />

                <div className="relative flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#5B69FF]/20 text-[#5B69FF]">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">파티 관리</h2>
                            <p className="text-xs text-gray-400 font-medium">드래그하여 나만의 순서를 설정할 수 있습니다.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Basic Info Section (이름, 파티장 변경) */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 ml-1">파티 이름</label>
                                {canManage ? (
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 rounded-xl bg-black/20 border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-[#5B69FF]/50 transition-all" placeholder="파티 이름을 입력하세요" maxLength={50} />
                                ) : (
                                    <div className="w-full h-11 flex items-center px-4 rounded-xl bg-white/5 border border-white/5 text-sm text-white font-medium">{party.name}</div>
                                )}
                            </div>

                            <div className="space-y-1.5 relative" ref={dropdownRef}>
                                <label className="text-xs font-semibold text-gray-400 ml-1 flex items-center gap-1">파티장 <Crown className="w-3 h-3 text-amber-400" /></label>
                                {canManage ? (
                                    <div className="relative">
                                        <button type="button" onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)} className={`w-full h-11 flex items-center justify-between px-4 rounded-xl border text-sm text-white transition-all ${isOwnerDropdownOpen ? "bg-black/30 border-[#5B69FF]/50" : "bg-black/20 border-white/10 hover:bg-black/30"}`}>
                                            <span className="truncate">{members.find((m) => m.id === ownerId)?.name || "선택 안됨"}</span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOwnerDropdownOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isOwnerDropdownOpen && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-2 p-1 bg-[#1E2028] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto scrollbar-thin">
                                                {members.map((m) => (
                                                    <button key={m.id} type="button" onClick={() => { setOwnerId(m.id); setIsOwnerDropdownOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${ownerId === m.id ? "bg-[#5B69FF]/20 text-[#8FA6FF]" : "text-gray-300 hover:bg-white/5"}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                                                                {m.image ? <img src={m.image} alt="" className="h-full w-full object-cover" /> : (m.name || "?").slice(0, 1)}
                                                            </div>
                                                            <span className="truncate">{m.name}</span>
                                                        </div>
                                                        {ownerId === m.id && <Check className="w-4 h-4 text-[#5B69FF]" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-11 flex items-center gap-2 px-4 rounded-xl bg-white/5 border border-white/5 text-sm text-white">
                                        <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                                            {leaderMember?.image ? <img src={leaderMember.image} alt="" className="h-full w-full object-cover" /> : (leaderMember?.name || "?").slice(0, 1)}
                                        </div>
                                        <span className="text-amber-400 font-medium text-xs border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded">파티장</span>
                                        <span className="truncate">{leaderMember?.name ?? "알 수 없음"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Shield className="w-3.5 h-3.5" />내 역할</div>
                            <div className="text-sm font-semibold text-white truncate">{getRoleLabel(party.myRole)}</div>
                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Swords className="w-3.5 h-3.5" /> 레이드</div>
                            <div className="text-sm font-semibold text-white">{typeof myRemainingRaids === "number" ? `${myRemainingRaids}개` : "-"}</div>
                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Calendar className="w-3.5 h-3.5" /> 생성일</div>
                            <div className="text-xs font-medium text-gray-200 truncate">{party.createdAt}</div>
                        </div>
                        <div className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Users className="w-3.5 h-3.5" /> 인원</div>
                            <div className="text-sm font-semibold text-white">{members.length}명</div>
                        </div>
                    </div>

                    {/* Members List (Drag & Drop) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="text-sm font-bold text-white">파티원 목록</h3>
                            <span className="text-xs text-gray-500">{members.length}명 참여 중</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {orderedMembers.map((m, idx) => {
                                const isLeader = m.id === ownerId;
                                const isSelf = myUserId && m.id === myUserId;
                                const canKickThis = canManage && !isLeader && !isSelf;

                                return (
                                    <div
                                        key={m.id}
                                        draggable={!isSelf}
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragEnter={(e) => handleDragEnter(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()} // 필수
                                        className={`
                                            group flex items-center justify-between p-3 rounded-xl border
                                            transition-all duration-200 ease-in-out
                                            ${isSelf
                                                ? 'bg-[#5B69FF]/5 border-[#5B69FF]/20 cursor-default'
                                                : 'cursor-move'
                                            }
                                            ${dragItem.current === idx
                                                ? 'bg-white/5 opacity-50 border-dashed border-white/20' // 내가 잡고 있는 아이템 스타일
                                                : dragOverIndex === idx && !isSelf
                                                    ? 'bg-[#5B69FF]/20 border-[#5B69FF]/50 scale-[1.02] z-10' // ✨ 맞교환될 대상 강조 (파란색)
                                                    : 'bg-white/5 border-transparent hover:bg-white/10' // 평소 상태
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">


                                            <div className="h-10 w-10 shrink-0 rounded-full bg-[#2a2d36] border border-white/10 flex items-center justify-center text-xs text-gray-300 overflow-hidden">
                                                {m.image ? <img src={m.image} alt="" className="h-full w-full object-cover" /> : (m.name || "?").slice(0, 1)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-sm font-medium text-white truncate max-w-[120px]">{m.name || "이름 없음"}</span>
                                                    {isSelf && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5B69FF]/20 text-[#8FA6FF]">나</span>}
                                                </div>
                                                {isLeader && (
                                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                                                        <Crown className="w-3 h-3 fill-amber-400/20" /> 파티장
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* 추방 버튼 */}
                                            {canKickThis && (
                                                <button type="button" onClick={() => handleKickClick(m)} disabled={kickLoadingId === m.id} className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                                    {kickLoadingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span className="text-xs font-medium">추방</span><UserX className="h-3.5 w-3.5" /></>}
                                                </button>
                                            )}
                                            {!isSelf && (
                                                <ArrowUpDown className="w-4 h-4 text-gray-600 group-hover:text-gray-400 cursor-grab" />
                                            )}
                                            {isSelf && <div className="w-4" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/5 bg-[#17191f] shrink-0">
                    <div className="flex-1">
                        {savingError && <p className="text-xs text-red-400 truncate">⚠️ {savingError}</p>}
                        {kickError && <p className="text-xs text-red-400 truncate">⚠️ {kickError}</p>}
                        {leaveError && <p className="text-xs text-red-400 truncate">⚠️ {leaveError}</p>}
                    </div>
                    <div className="flex gap-3">
                        {canLeave && (
                            <button type="button" onClick={handleLeaveClick} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors disabled:opacity-50">
                                {leaveLoading ? "나가는 중..." : "파티 나가기"}
                            </button>
                        )}
                        {canManage && (
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5B69FF] hover:bg-[#4a57e0] text-white text-sm font-semibold shadow-lg shadow-[#5B69FF]/20 transition-all active:scale-95 disabled:opacity-50">
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />} 저장하기
                            </button>
                        )}
                    </div>
                </div>

                {/* Confirm Modals (Leave / Kick) */}
                {leaveConfirmOpen && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setLeaveConfirmOpen(false)} />
                        <div className="relative w-full max-w-[340px] bg-[#22252e] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-500"><AlertTriangle className="w-6 h-6" /></div>
                                <h3 className="text-lg font-bold text-white mb-2">파티 나가기</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{canManage ? (members.length <= 1 ? "지금 나가면 파티원이 없어져 파티가 삭제됩니다." : "지금 나가면 파티장 권한이 다른 파티원에게 자동으로 넘어갑니다.") : "정말 이 파티에서 나가시겠습니까?"}</p>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setLeaveConfirmOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">취소</button>
                                <button onClick={confirmLeave} disabled={leaveLoading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50">{leaveLoading ? "처리 중..." : "나가기"}</button>
                            </div>
                        </div>
                    </div>
                )}
                {memberToKick && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMemberToKick(null)} />
                        <div className="relative w-full max-w-[320px] bg-[#22252e] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-500"><AlertTriangle className="w-6 h-6" /></div>
                                <h3 className="text-lg font-bold text-white mb-2">파티원 추방</h3>
                                <p className="text-sm text-gray-400 leading-relaxed"><span className="text-white font-semibold">{memberToKick.name}</span> 님을 파티에서 추방하시겠습니까?</p>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setMemberToKick(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">취소</button>
                                <button onClick={confirmKick} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95">추방하기</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}