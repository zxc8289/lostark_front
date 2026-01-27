// app/terms/page.tsx
import { FileText, CheckCircle, AlertTriangle, Copyright, Calendar, Scale } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="space-y-8 pt-17 pb-10 text-gray-300 w-full max-w-7xl mx-auto px-4 md:px-0">
            {/* 헤더 섹션 */}
            <div className="space-y-4 border-b border-white/5 pb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400">
                        <Scale size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-100 tracking-tighter">이용약관</h1>
                </div>
                <p className="text-gray-500 text-sm">
                    로아체크(loacheck.com) 서비스 이용을 위해 필요한 권리와 의무 사항을 안내드립니다.
                </p>
            </div>

            <div className="space-y-8">

                {/* 제 1 조 (목적) */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">제 1 조 (목적)</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <FileText size={18} />
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            본 약관은 <span className="text-gray-100 font-bold">로아체크</span>(이하 "서비스")가 제공하는 로스트아크 관련 도구 및 제반 서비스의 이용 조건과 절차에 관한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </div>
                </section>

                {/* 제 2 조 (서비스의 제공 및 변경) */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">제 2 조 (서비스의 제공 및 변경)</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <CheckCircle size={18} />
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            서비스는 로스트아크 공식 API를 활용한 데이터 조회 기능을 제공하며, 개인 프로젝트의 특성상 운영자의 사정에 따라 사전 고지 없이 서비스가 변경되거나 중단될 수 있습니다.
                        </p>
                    </div>
                </section>

                {/* 제 3 조 (책임의 제한) - 매우 중요 */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">제 3 조 (책임의 제한)</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-amber-500 shrink-0">
                            <AlertTriangle size={18} />
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            서비스에서 제공하는 데이터는 공식 API를 기반으로 하나, 시스템 오류나 지연으로 인해 게임 내 실제 정보와 다를 수 있습니다. 운영자는 이로 인해 발생하는 이용자의 유무형적 손실에 대해 책임을 지지 않습니다.
                        </p>
                    </div>
                </section>

                {/* 제 4 조 (저작권) */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">제 4 조 (저작권)</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <Copyright size={18} />
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            서비스 디자인 및 고유 기능의 저작권은 운영자에게 있으며, 서비스 내 사용된 게임 관련 이미지 및 데이터의 모든 권리는 <span className="text-gray-200 font-bold">(주)스마일게이트알피지</span>에 귀속됩니다.
                        </p>
                    </div>
                </section>

                {/* 시행일 안내 */}
                <section className="p-8 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] space-y-6">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" />
                        <h2 className="font-black text-gray-100 text-sm uppercase tracking-tight">서비스 시행일</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <p className="text-gray-400 leading-relaxed">
                            본 약관은 <span className="text-blue-400 font-bold">2026년 1월 16일</span>부터 시행됩니다.
                        </p>
                    </div>
                </section>
            </div>

            {/* 하단 안내 */}
            <div className="text-center pt-10 border-t border-white/5">
                <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">Last Updated: 2026. 01. 16</p>
            </div>
        </div>
    );
}