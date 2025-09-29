"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid"; // ✨ heroicons에서 아이콘 import

const items = [
    { href: "/", label: "홈" },
    { href: "/my-tasks", label: "내 숙제" },
    { href: "/party-tasks", label: "파티 숙제" },
    { href: "/dps-share", label: "딜 지분" },
    { href: "/gem-setup", label: "젬 세팅" },
    { href: "/crafting-efficiency", label: "제작 효율" },
];

export default function Nav() {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    return (
        <nav
            className={[
                "sticky top-0 z-40",
                "bg-[#1B1D22] border-b border-[#5C5C5C]",
                "h-20",
            ].join(" ")}
        >
            <div
                className={[
                    "w-full h-full",
                    "flex items-center justify-between",
                    "px-4 sm:px-6",
                ].join(" ")}
            >
                {/* 왼쪽: 로고 및 메뉴 */}
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="font-semibold tracking-wide text-gray-200 text-lg whitespace-nowrap"
                    >
                        THISISLOGO
                    </Link>
                    <ul
                        className={[
                            "hidden md:flex items-center",
                            "gap-3 lg:gap-4",
                            "text-sm text-gray-400",
                            "pl-10",
                        ].join(" ")}
                    >
                        {items.map((it) => {
                            const active =
                                pathname === it.href ||
                                (it.href !== "/" && pathname.startsWith(it.href));
                            return (
                                <li key={it.href}>
                                    <Link
                                        href={it.href}
                                        className={[
                                            "inline-block rounded-md transition-colors",
                                            "px-3 py-2",
                                            active
                                                ? "text-white font-semibold"
                                                : "hover:text-white",
                                        ].join(" ")}
                                    >
                                        {it.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* 오른쪽: 프로필 정보 */}
                <div>
                    {status === "loading" ? (
                        <div className="w-40 h-8 bg-gray-700 rounded-full animate-pulse" />
                    ) : session?.user ? (
                        <button
                            className={[
                                "flex items-center gap-2 rounded-full",
                                "hover:bg-gray-700/50 transition-colors",
                                "p-1.5",
                            ].join(" ")}
                        >
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name ?? 'User Avatar'}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 rounded-full"
                                />
                            )}
                            <span className="hidden sm:block text-sm text-gray-300">
                                {session.user.name}
                            </span>
                            {/* ✨ 기존 span 태그를 아이콘 컴포넌트로 교체 */}
                            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    ) : (
                        <button
                            onClick={() => signIn("discord")}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-500 transition-colors"
                        >
                            Discord로 로그인
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}