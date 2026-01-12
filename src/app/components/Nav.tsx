"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

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

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 w-full h-20 bg-[#1B1D22]/95 backdrop-blur-sm border-b border-[#5C5C5C]">
            <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-4 sm:px-6">

                {/* 왼쪽: 로고 및 메뉴 */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="font-semibold tracking-wide text-gray-200 text-lg whitespace-nowrap hover:text-white transition-colors"
                    >
                        THISISLOGO
                    </Link>

                    {/* 데스크톱 메뉴 */}
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

                {/* 오른쪽: 사용자 세션 상태 */}
                <div className="flex items-center">
                    {status === "loading" ? (
                        <div className="w-32 h-8 bg-gray-800 rounded-full animate-pulse" />
                    ) : session?.user ? (
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex items-center gap-2 rounded-full p-1.5 hover:bg-white/5 transition-all group"
                        >
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name ?? "User"}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 rounded-full border border-white/10"
                                />
                            )}
                            <span className="hidden sm:block text-sm text-gray-300 group-hover:text-white">
                                {session.user.name}
                            </span>
                            <ChevronDownIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                        </button>
                    ) : (
                        <button
                            onClick={() => signIn("discord")}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"
                        >
                            Discord로 로그인
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}