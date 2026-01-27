"use client";

import { Search, Sparkles, X, AlertCircle } from "lucide-react"; // AlertCircle 추가
import { useState, useEffect } from "react";

type Props = {
    onSearch: (nickname: string) => void;
    loading?: boolean;
    open: boolean;
    onClose: () => void;
    error?: string | null; // 👈 에러 메시지 받기 위해 추가
    visibleByChar?: Record<string, boolean>;
    onChangeVisible?: (next: Record<string, boolean>) => void;
};

export default function EmptyCharacterState({ open, onSearch, loading, onClose, error }: Props) {
    const [input, setInput] = useState("");

    // 모달이 열리거나 닫힐 때 인풋 초기화 (선택 사항)
    useEffect(() => {
        if (!open) setInput("");
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSearch(input.trim());
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            {/* 🔹 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 🔹 실제 모달 카드 */}
            <div
                className="relative w-full max-w-md p-8 rounded-2xl bg-[#16181D] border border-white/5 text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 닫기 버튼 */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 p-1.5 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:bg-black/60 text-xs"
                >
                    <X size={14} />
                </button>

                {/* 장식용 배경 효과 */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#5B69FF]/20 rounded-full blur-[50px] pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />

                {/* 메인 아이콘 */}
                <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center rounded-full bg-[#5B69FF]/10 text-[#5B69FF] ring-1 ring-[#5B69FF]/30">
                    <div className="relative z-10">
                        <Sparkles size={36} strokeWidth={1.5} />
                    </div>
                    {/* 장식 아이콘 */}
                    <div className="absolute -right-1 -bottom-1 bg-[#16181D] rounded-full p-1.5 border border-white/10 z-20">
                        <Search size={16} className="text-gray-400" />
                    </div>
                </div>

                {/* 텍스트 */}
                <h3 className="text-xl font-bold text-white mb-2">원정대 캐릭터를 불러오세요</h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                    아직 등록된 캐릭터가 없습니다.<br />
                    대표 캐릭터 닉네임을 입력하면 원정대 정보를 동기화합니다.
                </p>

                {/* 검색 폼 */}
                <form onSubmit={handleSubmit} className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="캐릭터 닉네임 입력"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        className={`
                            w-full h-12 pl-4 pr-12 rounded-lg bg-[#0F1115] border 
                            text-white placeholder-gray-500 text-sm transition-all disabled:opacity-50
                            focus:outline-none focus:ring-1
                            ${error
                                ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                                : "border-white/10 focus:border-[#5B69FF] focus:ring-[#5B69FF]"
                            }
                        `}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-1.5 p-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Search size={18} />
                        )}
                    </button>
                </form>

                {error && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-red-400 text-xs font-medium animate-in slide-in-from-top-1 fade-in">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2 text-xs text-gray-500">
                    <p>※ 로스트아크 공식 전투정보실 데이터를 기반으로 합니다.</p>
                </div>
            </div>
        </div>
    );
}