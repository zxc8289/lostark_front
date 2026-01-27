"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { ChevronDownIcon, BellIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";
import { UPDATE_LOGS } from "@/data/updateLogs";

const items = [
    { href: "/", label: "홈" },
    { href: "/my-tasks", label: "내 숙제" },
    { href: "/party-tasks", label: "파티 숙제" },
    { href: "/dps-share", label: "딜 지분" },
    { href: "/gem-setup", label: "젬 세팅" },
    { href: "/support", label: "문의하기" },
];

export default function Nav() {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [hasNewUpdates, setHasNewUpdates] = useState(false);

    const notiRef = useRef<HTMLDivElement>(null);

    // 1️⃣ [수정됨] 최신 ID 확인 로직 강화
    useEffect(() => {
        if (UPDATE_LOGS.length === 0) return;

        // 배열의 순서와 상관없이, ID들 중 '가장 큰 숫자'를 찾습니다.
        const maxId = Math.max(...UPDATE_LOGS.map(log => log.id));

        // 로컬 스토리지값 가져오기
        const lastSeenId = Number(localStorage.getItem("lastSeenUpdateId") || 0);

        // 저장된 것보다 더 큰 ID가 있으면 빨간불 On
        if (maxId > lastSeenId) {
            setHasNewUpdates(true);
        }
    }, []);

    // 2️⃣ [수정됨] 알림창 열 때 로직
    const handleBellClick = () => {
        if (!isNotiOpen) {
            setHasNewUpdates(false);
            if (UPDATE_LOGS.length > 0) {
                // 현재 존재하는 가장 큰 ID를 저장
                const maxId = Math.max(...UPDATE_LOGS.map(log => log.id));
                localStorage.setItem("lastSeenUpdateId", String(maxId));
            }
        }
        setIsNotiOpen(!isNotiOpen);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
                setIsNotiOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 3️⃣ [추가] 리스트 보여줄 때 ID 역순(최신순) 정렬
    // 원본 데이터를 건드리지 않고, 보여줄 때만 정렬해서 보여줍니다.
    const sortedLogs = [...UPDATE_LOGS].sort((a, b) => b.id - a.id);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 w-full h-20 bg-[#1B1D22]/95 backdrop-blur-sm border-b border-[#5C5C5C]">
            <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-4 sm:px-6">

                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="font-semibold tracking-wide text-gray-200 text-lg whitespace-nowrap hover:text-white transition-colors"
                    >
                        LOACHECK
                    </Link>

                    <ul className="hidden md:flex items-center gap-1 lg:gap-3 ml-4">
                        {items.map((it) => {
                            const active =
                                pathname === it.href ||
                                (it.href !== "/" && pathname.startsWith(it.href));
                            return (
                                <li key={it.href}>
                                    <Link
                                        href={it.href}
                                        className={`px-3 py-2 rounded-md text-sm transition-all ${active
                                            ? "text-white font-bold bg-white/5"
                                            : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                                            }`}
                                    >
                                        {it.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="flex items-center gap-3 sm:gap-5">

                    <div className="relative" ref={notiRef}>
                        <button
                            onClick={handleBellClick}
                            className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <BellIcon className="w-6 h-6" />
                            {hasNewUpdates && (
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#1B1D22]"></span>
                            )}
                        </button>

                        {isNotiOpen && (
                            <div
                                className={`
                                    absolute mt-3 
                                    w-80 sm:w-96 
                                    bg-[#25272e] border border-white/10 rounded-xl shadow-2xl overflow-hidden 
                                    animate-in fade-in zoom-in-95 duration-200 origin-top-right
                                    right-[-50px] sm:right-0
                                `}
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#2c2f36]">
                                    <h3 className="text-sm font-bold text-white">업데이트 내역</h3>
                                    <button onClick={() => setIsNotiOpen(false)} className="text-gray-400 hover:text-white">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto">
                                    {sortedLogs.length > 0 ? (
                                        <ul className="divide-y divide-white/5">
                                            {/* 🔹 정렬된 sortedLogs 사용 */}
                                            {sortedLogs.slice(0, 5).map((log) => (
                                                <li key={log.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.type === 'New' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            log.type === 'Fix' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-blue-500/20 text-blue-400'
                                                            }`}>
                                                            {log.type}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{log.date}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 leading-snug">
                                                        {log.content}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-6 text-center text-sm text-gray-500">
                                            업데이트 내역이 없습니다.
                                        </div>
                                    )}
                                </div>
                                <div className="px-4 py-2 bg-[#1f2126] border-t border-white/5 text-[11px] text-gray-500 text-center">
                                    최근 5개 업데이트 내역만 표시됩니다.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                    {status === "loading" ? (
                        <div className="w-32 h-8 bg-gray-800 rounded-full animate-pulse" />
                    ) : session?.user ? (
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex items-center gap-2 rounded-full p-1 hover:bg-white/5 transition-all group pr-3"
                        >
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name ?? "User"}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full border border-white/10"
                                />
                            )}
                            <div className="flex flex-col items-start">
                                <span className="hidden sm:block text-sm font-medium text-gray-200 group-hover:text-white">
                                    {session.user.name}
                                </span>
                            </div>
                            <ChevronDownIcon className="w-3 h-3 text-gray-500 group-hover:text-gray-300 ml-1" />
                        </button>
                    ) : (
                        <button
                            onClick={() => signIn("discord")}
                            className="bg-[#5865F2] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#4752C4] transition-all shadow-lg shadow-[#5865F2]/20 active:scale-95"
                        >
                            Discord 로그인
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}