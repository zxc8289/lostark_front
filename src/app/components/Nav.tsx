"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import {
    ChevronDownIcon,
    BellIcon,
    XMarkIcon,
    ExclamationCircleIcon,
    ArrowLeftStartOnRectangleIcon,
    PencilSquareIcon,
    CheckIcon,
    Bars3Icon
} from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";
import { UPDATE_LOGS } from "@/data/updateLogs";
import { readPrefs } from "../lib/tasks/raid-prefs";
import { computeRaidSummaryForRoster } from "../lib/tasks/raid-utils";
import { Loader2, TrashIcon } from "lucide-react";

/* 타입 정의 */
type AlertItem = {
    id: string;
    title: string;
    content: string;
    date: string;
    count: number;
    isRead: false;
};

type RaidTaskState = {
    accounts?: any[];
    nickname?: string;
    summary?: any;
    prefsByChar?: any;
    visibleByChar?: Record<string, boolean>;
};

// 🔥 서브 아이템을 가질 수 있도록 타입 수정
type NavItem = {
    href?: string;
    label: string;
    subItems?: { href: string; label: string }[];
};

const items: NavItem[] = [
    { href: "/", label: "홈" },
    { href: "/my-tasks", label: "내 숙제" },
    { href: "/party-tasks", label: "파티 숙제" },
    { href: "/dps-share", label: "딜 지분" },
    { href: "/gem-setup", label: "젬 세팅" },
    {
        href: "/calculator",
        label: "계산기",
        subItems: [
            { href: "/calculator", label: "경매 계산기" },
            // { href: "/", label: "테스트" },
        ]
    },
    { href: "/support", label: "문의하기" },
];

export default function Nav() {
    const pathname = usePathname();
    const { data: session, status, update } = useSession();

    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotiEnabled, setIsNotiEnabled] = useState(true);
    const [isEditAuthEnabled, setIsEditAuthEnabled] = useState(true);
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editedNickname, setEditedNickname] = useState("");
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [hasNewUpdates, setHasNewUpdates] = useState(false);
    const [activeTab, setActiveTab] = useState<"notice" | "alert">("notice");
    const [taskAlerts, setTaskAlerts] = useState<AlertItem[]>([]);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // 🔥 데스크탑 드롭다운 상태 추가
    const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

    const notiRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedNoti = localStorage.getItem("isNotiEnabled");
        if (savedNoti !== null) setIsNotiEnabled(savedNoti === "true");

        const savedEditAuth = localStorage.getItem("isEditAuthEnabled");
        if (savedEditAuth !== null) setIsEditAuthEnabled(savedEditAuth === "true");
    }, []);

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const userId = (session.user as any).id;
            const storageKey = `isEditAuthEnabled_${userId}`;

            const savedEditAuth = localStorage.getItem(storageKey);

            if (savedEditAuth !== null) {
                setIsEditAuthEnabled(savedEditAuth === "true");
            } else {
                const dbAuthValue = (session.user as any).canOthersEdit;
                if (dbAuthValue !== undefined) {
                    setIsEditAuthEnabled(dbAuthValue);
                    localStorage.setItem(storageKey, String(dbAuthValue));
                }
            }
        }
    }, [session, status]);

    const toggleNotification = () => {
        const newState = !isNotiEnabled;
        setIsNotiEnabled(newState);
        localStorage.setItem("isNotiEnabled", String(newState));
    };

    const handleDeleteAccount = async () => {
        if (isDeletingAccount) return;

        setIsDeletingAccount(true);
        try {
            const res = await fetch("/api/user/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                alert("그동안 이용해주셔서 감사합니다. 모든 데이터가 삭제되었습니다.");
                signOut({ callbackUrl: "/" });
            } else {
                const data = await res.json();
                throw new Error(data.error || "탈퇴 처리 중 오류 발생");
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setIsDeletingAccount(false);
            setIsDeleteModalOpen(false);
        }
    };

    const toggleEditAuth = async () => {
        const newState = !isEditAuthEnabled;
        setIsEditAuthEnabled(newState);
        const userId = (session?.user as any)?.id;
        if (userId) localStorage.setItem(`isEditAuthEnabled_${userId}`, String(newState));

        try {
            const res = await fetch("/api/user/setting", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ canOthersEdit: newState }),
            });
            if (!res.ok) throw new Error("저장 실패");
        } catch (e) {
            console.error(e);
            setIsEditAuthEnabled(!newState);
            if (userId) localStorage.setItem(`isEditAuthEnabled_${userId}`, String(!newState));
            alert("권한 설정 저장에 실패했습니다.");
        }
    };

    useEffect(() => {
        if (UPDATE_LOGS.length === 0) return;
        const maxId = Math.max(...UPDATE_LOGS.map(log => log.id));
        const lastSeenId = Number(localStorage.getItem("lastSeenUpdateId") || 0);
        if (maxId > lastSeenId) setHasNewUpdates(true);
    }, []);

    useEffect(() => {
        if (status !== "authenticated" || !isNotiEnabled) {
            setTaskAlerts([]);
            return;
        }
        const checkTimeAndFetch = async () => {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const isWarningPeriod = (day === 2) || (day === 3 && hour < 6);

            if (!isWarningPeriod) {
                setTaskAlerts([]);
                return;
            }
            try {
                const res = await fetch("/api/raid-tasks/state", { method: "GET", cache: "no-store" });
                if (res.status === 204 || !res.ok) return;
                const data: RaidTaskState = await res.json();

                let accounts: any[] = [];
                if (data.accounts && Array.isArray(data.accounts)) {
                    accounts = data.accounts;
                } else if (data.nickname && data.summary) {
                    accounts = [{ id: data.nickname, nickname: data.nickname, summary: data.summary }];
                }
                if (accounts.length === 0) return;

                const dbPrefs = data.prefsByChar || {};
                const visibleMap = data.visibleByChar || {};
                const alerts: AlertItem[] = [];

                accounts.forEach((acc) => {
                    const rawRoster = acc.summary?.roster ?? [];
                    if (rawRoster.length === 0) return;

                    const roster = rawRoster.filter((c: any) => visibleMap[c.name] !== false);
                    if (roster.length === 0) return;

                    const currentPrefs: any = {};
                    roster.forEach((c: any) => {
                        currentPrefs[c.name] = dbPrefs[c.name] ?? readPrefs(c.name) ?? { raids: {} };
                    });

                    const { totalRemainingTasks } = computeRaidSummaryForRoster(roster, currentPrefs);

                    if (totalRemainingTasks > 0) {
                        alerts.push({
                            id: acc.id,
                            title: acc.nickname,
                            content: `완료하지 않은 숙제가 ${totalRemainingTasks}개 있습니다.`,
                            date: "수요일 초기화",
                            count: totalRemainingTasks,
                            isRead: false
                        });
                    }
                });
                setTaskAlerts(alerts);
            } catch (e) {
                console.error("Failed to fetch raid tasks:", e);
            }
        };
        checkTimeAndFetch();
        const timerId = setInterval(checkTimeAndFetch, 60000);
        return () => clearInterval(timerId);
    }, [status, pathname, isNotiEnabled]);

    const handleBellClick = () => {
        if (!isNotiOpen) {
            setHasNewUpdates(false);
            if (UPDATE_LOGS.length > 0) {
                const maxId = Math.max(...UPDATE_LOGS.map(log => log.id));
                localStorage.setItem("lastSeenUpdateId", String(maxId));
            }
        }
        setIsNotiOpen(!isNotiOpen);
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
        setOpenDropdownIdx(null);
    };

    const handleProfileClick = () => {
        setIsProfileOpen(!isProfileOpen);
        setIsNotiOpen(false);
        setIsEditingNickname(false);
        setStatusMessage(null);
        setIsMobileMenuOpen(false);
        setOpenDropdownIdx(null);
    };

    const handleMobileMenuClick = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        setIsNotiOpen(false);
        setIsProfileOpen(false);
    };

    const startEditing = () => {
        setEditedNickname(session?.user?.name || "");
        setIsEditingNickname(true);
        setStatusMessage(null);
    };

    const saveNickname = async () => {
        if (!editedNickname.trim() || isSavingNickname) return;
        setIsSavingNickname(true);
        setStatusMessage(null);

        try {
            const res = await fetch("/api/user/nickname", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: editedNickname }),
            });
            const data = await res.json();
            if (res.ok) {
                await update({ name: editedNickname });
                setStatusMessage({ type: 'success', text: '변경 완료!' });
                setTimeout(() => {
                    setIsEditingNickname(false);
                    setStatusMessage(null);
                }, 1500);
            } else {
                setStatusMessage({ type: 'error', text: data.error || '변경 실패' });
            }
        } catch (e) {
            console.error(e);
            setStatusMessage({ type: 'error', text: '네트워크 오류' });
        } finally {
            setIsSavingNickname(false);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (notiRef.current && !notiRef.current.contains(target)) setIsNotiOpen(false);
            if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) setIsMobileMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setOpenDropdownIdx(null);
    }, [pathname]);

    const sortedLogs = [...UPDATE_LOGS].sort((a, b) => b.id - a.id);
    const hasAnyAlert = hasNewUpdates || taskAlerts.length > 0;

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 w-full h-20 bg-[#1B1D22]/95 backdrop-blur-sm border-b border-[#5C5C5C]">
                <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-4 sm:px-6">

                    <div className="flex items-center gap-6 h-full">
                        <Link href="/" className="font-semibold tracking-wide text-gray-200 text-xl md:text-2xl whitespace-nowrap hover:text-white transition-colors">LOACHECK</Link>

                        {/* 데스크탑 메뉴 */}
                        <ul className="hidden md:flex items-center gap-1 lg:gap-3 ml-4 h-full">
                            {items.map((it, idx) => {
                                // 서브 메뉴가 있는 경우 (계산기)
                                if (it.subItems) {
                                    const isAnySubActive = pathname === it.href || it.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + "/"));
                                    const isOpen = openDropdownIdx === idx;

                                    return (
                                        <li
                                            key={it.label}
                                            className="relative desktop-dropdown flex items-center h-full"
                                            onMouseEnter={() => setOpenDropdownIdx(idx)}
                                            onMouseLeave={() => setOpenDropdownIdx(null)}
                                        >
                                            {/* 🔥 다시 <Link>로 변경하여 클릭 시 페이지 이동 적용 */}
                                            <Link
                                                href={it.href!}
                                                onClick={() => setOpenDropdownIdx(isOpen ? null : idx)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-all ${isAnySubActive ? "text-white font-bold bg-white/5" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
                                            >
                                                {it.label}
                                            </Link>

                                            {/* 데스크탑 드롭다운 메뉴 (hover 풀림 방지를 위해 pt-2 추가, 마진 제거) */}
                                            {isOpen && (
                                                <div className="absolute top-[80%] pt-2 left-0 w-40 z-50">
                                                    <div className="bg-[#25272e] border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                        <ul className="flex flex-col">
                                                            {it.subItems.map(sub => {
                                                                const isSubActive = pathname === sub.href;
                                                                return (
                                                                    <li key={sub.href}>
                                                                        <Link
                                                                            href={sub.href}
                                                                            onClick={() => setOpenDropdownIdx(null)}
                                                                            className={`block px-4 py-2.5 text-sm transition-colors ${isSubActive ? "text-white bg-[#5B69FF]/20 font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                                                                        >
                                                                            {sub.label}
                                                                        </Link>
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    );
                                }

                                // 일반 단일 메뉴
                                const active = it.href && (pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href)));
                                return (
                                    <li key={it.href} className="flex items-center h-full">
                                        <Link href={it.href!} className={`px-3 py-2 rounded-md text-sm transition-all ${active ? "text-white font-bold bg-white/5" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}>
                                            {it.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-5">
                        <div className="relative" ref={notiRef}>
                            <button onClick={handleBellClick} className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <BellIcon className="w-6 h-6" />
                                {hasAnyAlert && isNotiEnabled && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#1B1D22]"></span>}
                            </button>

                            {isNotiOpen && (
                                <div className="absolute mt-3 w-80 sm:w-96 bg-[#25272e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right right-[-50px] sm:right-0">
                                    <div className="flex items-center bg-[#2c2f36] border-b border-white/5 relative">
                                        <button onClick={() => setActiveTab("notice")} className={`flex-1 py-3 text-sm font-bold text-center transition-all ${activeTab === "notice" ? "text-white border-b-2 border-[#5B69FF] bg-white/5" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}>
                                            공지사항 {hasNewUpdates && <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-red-500 rounded-full align-middle mb-0.5"></span>}
                                        </button>
                                        <button onClick={() => setActiveTab("alert")} className={`flex-1 py-3 text-sm font-bold text-center transition-all ${activeTab === "alert" ? "text-white border-b-2 border-[#5B69FF] bg-white/5" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}>
                                            레이드 알림 {taskAlerts.length > 0 && isNotiEnabled && (<span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full align-middle">{taskAlerts.length}</span>)}
                                        </button>
                                        <button onClick={() => setIsNotiOpen(false)} className="absolute right-3 text-gray-400 hover:text-white p-1"><XMarkIcon className="w-4 h-4" /></button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-[#25272e]">
                                        {activeTab === "notice" ? (
                                            sortedLogs.length > 0 ? (
                                                <ul className="divide-y divide-white/5">
                                                    {sortedLogs.slice(0, 5).map((log) => (
                                                        <li key={log.id} className="px-4 py-4 hover:bg-white/5 transition-colors">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.type === 'New' ? 'bg-emerald-500/20 text-emerald-400' : log.type === 'Fix' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{log.type}</span>
                                                                <span className="text-xs text-gray-500">{log.date}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-300 leading-snug">{log.content}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (<div className="flex flex-col items-center justify-center h-[150px] text-gray-500"><ExclamationCircleIcon className="w-8 h-8 mb-2 opacity-50" /><span className="text-sm">업데이트 내역이 없습니다.</span></div>)
                                        ) : (
                                            !isNotiEnabled ? (
                                                <div className="flex flex-col items-center justify-center h-[150px] text-gray-500"><BellIcon className="w-8 h-8 mb-2 opacity-20" /><span className="text-sm font-medium text-gray-400">알림 설정이 꺼져있습니다.</span></div>
                                            ) : taskAlerts.length > 0 ? (
                                                <ul className="divide-y divide-white/5">
                                                    {taskAlerts.map((alert, idx) => (
                                                        <li key={idx} className="px-4 py-3 hover:bg-white/5 transition-colors group cursor-default">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0"><BellIcon className="w-4 h-4" /></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between mb-0.5"><span className="text-sm font-bold text-gray-200">{alert.title}</span><span className="text-[10px] text-gray-600">{alert.date}</span></div>
                                                                    <p className="text-sm text-gray-400 leading-snug">{alert.content}</p>
                                                                    <div className="mt-2"><Link href="/my-tasks" onClick={() => setIsNotiOpen(false)} className="text-[11px] text-[#5B69FF] font-medium hover:underline flex items-center gap-1">숙제 확인하러 가기 &rarr;</Link></div>
                                                                </div>
                                                                <div className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (<div className="flex flex-col items-center justify-center h-[150px] text-gray-500"><BellIcon className="w-8 h-8 mb-2 opacity-20" /><span className="text-sm font-medium text-gray-400">새로운 알림이 없습니다.</span></div>)
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                        {/* 👤 유저 프로필 영역 */}
                        <div className="relative" ref={profileRef}>
                            {status === "loading" ? (
                                <div className="w-24 md:w-32 h-8 bg-gray-800 rounded-full animate-pulse" />
                            ) : session?.user ? (
                                <>
                                    <button onClick={handleProfileClick} className={`flex items-center gap-2 rounded-full p-1 transition-all group pr-3 ${isProfileOpen ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                        {session.user.image && <Image src={session.user.image} alt={session.user.name ?? "User"} width={32} height={32} className="w-8 h-8 rounded-full border border-white/10" />}
                                        <div className="flex flex-col items-start"><span className="hidden sm:block text-sm font-medium text-gray-200 group-hover:text-white">{session.user.name}</span></div>
                                        <ChevronDownIcon className={`w-3 h-3 text-gray-500 group-hover:text-gray-300 ml-1 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isProfileOpen && (
                                        <div className="absolute top-full right-0 mt-3 w-64 bg-[#25272e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                                            <div className="p-4 flex items-center gap-3 border-b border-white/5 bg-[#2c2f36]">
                                                {session.user.image ? (
                                                    <Image src={session.user.image} alt="Profile" width={40} height={40} className="rounded-full border border-white/10 shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold shrink-0">{session.user.name?.charAt(0)}</div>
                                                )}

                                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                                    {!isEditingNickname ? (
                                                        <div className="flex items-center gap-1.5 group/edit h-5">
                                                            <span className="text-sm font-bold text-white truncate max-w-[120px]" title={session.user.name ?? ""}>{session.user.name}</span>
                                                            <button onClick={startEditing} className="text-gray-500 hover:text-[#5B69FF] transition-colors p-0.5 rounded hover:bg-white/5">
                                                                <PencilSquareIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 w-full animate-in fade-in duration-200 h-6 mb-1">
                                                            <input
                                                                type="text"
                                                                value={editedNickname}
                                                                onChange={(e) => setEditedNickname(e.target.value)}
                                                                className="flex-1 min-w-0 bg-[#16181D] border border-white/20 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-[#5B69FF]"
                                                                autoFocus
                                                                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                                                            />
                                                            <button onClick={saveNickname} disabled={isSavingNickname} className="text-emerald-500 hover:text-emerald-400 p-0.5 rounded hover:bg-white/5"><CheckIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => setIsEditingNickname(false)} className="text-red-500 hover:text-red-400 p-0.5 rounded hover:bg-white/5"><XMarkIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    )}

                                                    <div className="h-4 flex items-center mt-0.5">
                                                        {statusMessage ? (
                                                            <span className={`text-[10px] font-bold animate-in fade-in slide-in-from-top-1 ${statusMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {statusMessage.text}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-500">Discord User</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-2 space-y-1">
                                                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors select-none cursor-pointer" onClick={toggleNotification}>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-gray-300">레이드 알림</span>
                                                        <span className="text-[10px] text-gray-500">숙제 마감 임박 알림 받기</span>
                                                    </div>
                                                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isNotiEnabled ? 'bg-[#5B69FF]' : 'bg-gray-600'}`}>
                                                        <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isNotiEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors select-none cursor-pointer" onClick={toggleEditAuth}>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-gray-300">숙제 수정 권한</span>
                                                        <span className="text-[10px] text-gray-500">다른 사람의 숙제 수정 허용</span>
                                                    </div>
                                                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isEditAuthEnabled ? 'bg-[#5B69FF]' : 'bg-gray-600'}`}>
                                                        <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEditAuthEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                                <div className="h-px bg-white/5 my-1 mx-2" />

                                                <div className="p-2">
                                                    <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors">
                                                        <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                                                        로그아웃
                                                    </button>
                                                </div>
                                                <div className="p-2 pt-0">
                                                    <button
                                                        onClick={() => {
                                                            setIsDeleteModalOpen(true);
                                                            setIsProfileOpen(false);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                        회원 탈퇴
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <button onClick={() => signIn("discord")} className="bg-[#5865F2] text-white px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-bold hover:bg-[#4752C4] transition-all shadow-lg shadow-[#5865F2]/20 active:scale-95">Discord 로그인</button>
                            )}
                        </div>

                        {/* 🔥 햄버거 토글 버튼 */}
                        <button
                            className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            onClick={handleMobileMenuClick}
                        >
                            {isMobileMenuOpen ? (
                                <XMarkIcon className="w-6 h-6" />
                            ) : (
                                <Bars3Icon className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 🔥 모바일 드롭다운 메뉴 */}
                {isMobileMenuOpen && (
                    <div
                        ref={mobileMenuRef}
                        className="md:hidden absolute top-20 left-0 w-full bg-[#1B1D22] border-b border-[#5C5C5C] shadow-2xl animate-in slide-in-from-top-2 duration-200 z-40 max-h-[80vh] overflow-y-auto custom-scrollbar"
                    >
                        <ul className="flex flex-col px-4 py-4 space-y-1">
                            {items.map((it, idx) => {
                                if (it.subItems) {
                                    const isAnySubActive = pathname === it.href || it.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + "/"));
                                    const isOpen = openDropdownIdx === idx;

                                    return (
                                        <li key={it.label} className="flex flex-col">
                                            <div className={`flex items-center justify-between rounded-xl transition-all ${isAnySubActive ? "text-white bg-[#5B69FF]/10 border border-[#5B69FF]/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                                <Link
                                                    href={it.href!}
                                                    className="flex-1 px-4 py-3 font-medium"
                                                >
                                                    {it.label}
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setOpenDropdownIdx(isOpen ? null : idx);
                                                    }}
                                                    className="px-4 py-3 h-full flex items-center justify-center border-l border-white/5"
                                                >
                                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>

                                            {isOpen && (
                                                <ul className="flex flex-col pl-4 mt-1 space-y-1 animate-in slide-in-from-top-1 duration-150">
                                                    {it.subItems.map(sub => {
                                                        const isSubActive = pathname === sub.href;
                                                        return (
                                                            <li key={sub.href}>
                                                                <Link
                                                                    href={sub.href}
                                                                    className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${isSubActive ? "text-white bg-[#5B69FF]/10 border border-[#5B69FF]/20" : "text-gray-500 hover:text-gray-300"}`}
                                                                >
                                                                    {sub.label}
                                                                </Link>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                }

                                const active = it.href && (pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href)));
                                return (
                                    <li key={it.href}>
                                        <Link
                                            href={it.href!}
                                            className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${active
                                                ? "text-white bg-[#5B69FF]/10 border border-[#5B69FF]/20"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            {it.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </nav>
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                    <ExclamationCircleIcon className="h-7 w-7" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">정말 탈퇴하시겠습니까?</h3>
                                <div className="text-sm text-gray-400 leading-relaxed mb-6 space-y-1">
                                    <p>탈퇴 시 귀하의 모든 <span className="text-red-400 font-bold">원정대 정보,</span></p>
                                    <p><span className="text-red-400 font-bold">파티 소속 정보, 설정 데이터</span>가</p>
                                    <p>즉시 영구 삭제되며 복구할 수 없습니다.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm"
                                        disabled={isDeletingAccount}
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm shadow-lg shadow-red-500/20"
                                    >
                                        {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "영구 탈퇴"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}