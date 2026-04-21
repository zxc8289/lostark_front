"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (memo: string) => void;
    charName: string;
    initialMemo?: string;
};

export default function MemoModal({ isOpen, onClose, onSave, charName, initialMemo = "" }: Props) {
    const [memo, setMemo] = useState(initialMemo);

    // 모달이 열릴 때마다 초기 메모 값 세팅
    useEffect(() => {
        if (isOpen) setMemo(initialMemo);
    }, [isOpen, initialMemo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#252832]">
                    <h3 className="text-base font-bold text-white">
                        <span>{charName}</span> 메모
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5">
                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="캐릭터에 대한 메모를 적어주세요."
                        className="w-full h-32 p-3 bg-[#0F1115] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#5B69FF] resize-none"
                    />
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => {
                                onSave(memo);
                                onClose();
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold transition-colors"
                        >
                            저장하기
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}