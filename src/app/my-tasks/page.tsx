// app/my-tasks/page.tsx (또는 원하는 곳)
"use client";

import AddAccount from "../components/AddAccount";

function RaidBox({ label = "레이드 1" }) {
    return (
        <div className="h-24 border rounded-md flex items-center justify-center text-gray-600">
            {label}
        </div>
    );
}

function AddButton() {
    return (
        <button
            type="button"
            aria-label="레이드 추가"
            className="h-24 w-full border rounded-md flex items-center justify-center text-xl text-gray-600 hover:bg-gray-50"
        >
            +
        </button>
    );
}

function CharacterSection({ title }: { title: string }) {
    return (
        <section className="border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>

            {/* 4열 그리드: 1행(레이드1~3 + +버튼), 2행(레이드1~2) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* 1행 */}
                <RaidBox label="레이드 1" />
                <RaidBox label="레이드 2" />
                <RaidBox label="레이드 3" />
                <AddButton />

                {/* 2행 */}
                <RaidBox label="레이드 1" />
                <RaidBox label="레이드 2" />
                {/* 나머지 칸은 비워둠(정렬만 유지) */}
                <div className="hidden md:block" />
                <div className="hidden md:block" />
            </div>
        </section>
    );
}

export default function MyTasksSkeleton() {
    return (
        <div className="space-y-8 text-gray-300 w-full">
            <AddAccount onSuccess={(data) => console.log("캐릭터 추가됨:", data)} />
            <CharacterSection title="캐릭터 1" />
            <CharacterSection title="캐릭터 2" />
            <CharacterSection title="캐릭터 3" />
        </div>
    );
}
