// app/privacy/page.tsx
import { ShieldCheck, Mail, Info, History, Users, UserCog } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="space-y-8 pt-17 pb-10 text-gray-300 w-full max-w-7xl mx-auto px-4 md:px-0">
            {/* 헤더 섹션 */}
            <div className="space-y-4 border-b border-white/5 pb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400">
                        <ShieldCheck size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-100 tracking-tighter">개인정보처리방침</h1>
                </div>
                <p className="text-gray-500 text-sm">
                    로아체크(loacheck.com)는 이용자의 개인정보를 소중히 여기며, 투명한 정보 처리를 위해 최선을 다합니다.
                </p>
            </div>

            <div className="space-y-8">

                {/* 1. 수집 항목 */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">1. 수집하는 개인정보 항목</h2>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed">
                        <p>
                            본 서비스는 별도의 회원가입 절차 없이 <span className="text-blue-400 font-bold">디스코드(Discord) OAuth2</span> 인증을 통해서만 로그인을 진행합니다. 이 과정에서 다음과 같은 정보가 전달됩니다.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                <span className="text-[10px] text-gray-500 font-bold block mb-1">필수 수집 항목</span>
                                <p className="text-xs text-gray-300">디스코드 UID, 닉네임, 프로필 이미지</p>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                <span className="text-[10px] text-gray-500 font-bold block mb-1">디스코드 봇 이용 시</span>
                                <p className="text-xs text-gray-300">서버 ID, 서버명, 채널 ID, 채널명, 명령어 및 버튼 사용 기록</p>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5 md:col-span-2">
                                <span className="text-[10px] text-gray-500 font-bold block mb-1">수집하지 않는 항목</span>
                                <p className="text-xs text-gray-300">디스코드 비밀번호, 전화번호, 결제 정보, 개인 메시지 내용 등 민감 정보</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. 이용 목적 */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">2. 이용 목적</h2>
                    </div>
                    <div className="flex items-start gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                            <Info size={18} />
                        </div>
                        <ul className="space-y-2 text-gray-400">
                            <li>• 사용자 식별 및 서비스 이용 기록(숙제 현황 등) 저장</li>
                            <li>• 파티 숙제, 레이드 그룹, 디스코드 모집글 기능 제공</li>
                            <li>• 디스코드 봇의 명령어 사용량, 서버 및 채널 연동 상태 확인</li>
                            <li>• 부정 이용 방지 및 안정적인 서비스 환경 제공</li>
                            <li>• 서비스 품질 개선 및 통계 분석</li>
                        </ul>
                    </div>
                </section>

                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">3. 디스코드 봇 관련 정보 처리</h2>
                    </div>
                    <div className="flex items-start gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <Info size={18} />
                        </div>
                        <div className="space-y-2 text-gray-400 leading-relaxed">
                            <p>
                                로아체크 디스코드 봇은 레이드 모집글 생성, 참여, 참여 취소, 새로고침, 모집글 삭제 기능을 제공하기 위해 필요한 범위의 정보를 처리합니다.
                            </p>
                            <ul className="space-y-1">
                                <li>• 봇이 추가된 디스코드 서버 ID와 서버명</li>
                                <li>• 봇이 접근 가능한 채널 ID, 채널명, 채널 유형</li>
                                <li>• 명령어 실행자와 버튼 사용자 식별을 위한 디스코드 사용자 ID</li>
                                <li>• 레이드 모집 기능 이용 기록 및 오류 기록</li>
                            </ul>
                            <p>
                                위 정보는 봇 기능 제공, 사용량 확인, 오류 대응 및 서비스 개선 목적으로만 사용됩니다.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. 제3자 제공 및 위탁 (추가된 항목) */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">4. 제3자 제공 및 위탁</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <Users size={18} />
                        </div>
                        <div className="space-y-2 text-gray-400 leading-relaxed">
                            <p>
                                본 서비스는 이용자의 개인정보를 원칙적으로 외부에 판매하거나 임의로 제공하지 않습니다.
                            </p>
                            <p>
                                다만, 디스코드 로그인 및 봇 기능은 Discord의 플랫폼 기능을 사용하므로 디스코드 서비스 이용 과정에서 Discord의 정책이 함께 적용될 수 있습니다.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. 보유 및 파기 */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">5. 보유 및 파기</h2>
                    </div>
                    {/* items-start를 items-center로 변경 */}
                    <div className="flex items-start gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <History size={18} />
                        </div>
                        <div className="space-y-2 text-gray-400 leading-relaxed">
                            <p>
                                이용자가 서비스 이용을 중단하거나 데이터 삭제를 요청할 경우, 수집된 정보는 서버에서 <span className="text-gray-200 font-bold">지체 없이 파기</span>됩니다.
                            </p>
                            <p>
                                디스코드 봇이 서버에서 제거된 경우 해당 서버의 활성 상태는 비활성으로 표시되며, 운영상 필요한 범위를 넘는 데이터는 삭제 요청에 따라 처리합니다.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 5. 이용자의 권리 (추가된 항목) */}
                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h2 className="font-bold text-lg text-gray-100 text-sm uppercase tracking-tight">6. 이용자의 권리</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="p-2 rounded-lg bg-white/5 text-gray-400 shrink-0">
                            <UserCog size={18} />
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            이용자는 언제든지 서비스 내 설정 또는 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다. 또한, 운영자에게 이메일을 통해 자신의 데이터 파기를 요구할 권리가 있으며 운영자는 이를 지체 없이 처리합니다.
                        </p>
                    </div>
                </section>

                <section className="p-6 rounded-xl border border-white/5 bg-[#1e2128]/30 space-y-4">
                    <h2 className="font-bold text-lg text-gray-100 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full" />7. Google 광고, 쿠키와 브라우저 저장소</h2>
                    <div className="space-y-4 text-sm leading-7 text-gray-400">
                        <p>로아체크는 광고 게재를 위한 Google AdSense 코드를 사용합니다. 광고가 게재되는 경우 Google과 제3자 광고 공급업체는 쿠키 등을 이용해 이 사이트 또는 다른 웹사이트의 이전 방문 기록에 기반한 광고를 제공할 수 있습니다. 광고 제공·측정 과정에서 쿠키 식별자, IP 주소, 브라우저·기기 정보와 광고 상호작용 정보 등이 처리될 수 있습니다.</p>
                        <p>제3자는 브라우저에 쿠키를 저장하거나 읽고, 웹 비콘 등의 기술을 사용할 수 있습니다. Google의 처리 방식은 <a className="text-blue-300 underline" href="https://policies.google.com/technologies/partner-sites?hl=ko">Google 파트너 사이트의 정보 이용 안내</a>와 <a className="text-blue-300 underline" href="https://policies.google.com/privacy?hl=ko">Google 개인정보처리방침</a>에서 확인할 수 있습니다.</p>
                        <p>개인 맞춤 광고는 <a className="text-blue-300 underline" href="https://myadcenter.google.com/">Google 내 광고 센터</a>에서 관리할 수 있습니다. 제3자 광고 업체의 개인 맞춤 광고 선택은 <a className="text-blue-300 underline" href="https://optout.aboutads.info/">광고 업계의 선택 도구</a>에서도 확인할 수 있습니다. 맞춤 광고를 해제해도 일반 광고는 표시될 수 있습니다.</p>
                        <p>로그인 상태 유지에는 인증 쿠키가, 비로그인 숙제 기록·계산기 입력·화면 설정 보관에는 브라우저 로컬 저장소가 사용됩니다. 브라우저 설정에서 쿠키를 차단하거나 저장 데이터를 삭제할 수 있으며, 이 경우 로그인이 해제되거나 해당 기기의 비로그인 기록과 설정이 삭제될 수 있습니다. 브라우저 데이터 삭제와 서버에 저장한 계정 데이터 삭제는 별개입니다.</p>
                        <p>사이트는 Google Tag Manager로 태그를 관리합니다. 태그 관리 도구의 사용만으로 특정 분석 서비스가 항상 실행되는 것은 아니며, 추가 데이터 수집 기능을 도입하거나 처리 목적을 변경하는 경우 이 방침에 반영합니다.</p>
                    </div>
                </section>

                {/* 6. 운영자 정보 */}
                <section className="p-8 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] space-y-6">
                    <div className="flex items-center gap-2">
                        <Mail size={20} className="text-blue-500" />
                        <h2 className="font-black text-gray-100 text-sm uppercase tracking-tight">개인정보 보호 책임자</h2>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 text-sm">
                        <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">운영자</span>
                            <p className="text-gray-200 font-bold">최철</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">문의 이메일</span>
                            <p className="text-blue-400 font-medium">zxc8289@gmail.com</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* 하단 안내 */}
            <div className="text-center pt-10 border-t border-white/5">
                <p className="text-xs text-gray-400">최종 수정: 2026. 09. 25 · Google 광고 및 브라우저 저장소 안내 보강</p>
            </div>
        </div>
    );
}
