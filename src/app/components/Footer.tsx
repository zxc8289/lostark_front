// components/Footer.tsx
import { RiDiscordFill, RiGithubFill } from "react-icons/ri";
import { Activity, ShieldCheck, FileText, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="w-full pt-5 pb-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 pt-12 pb-12 border-b border-white/[0.03]  border-t border-white/[0.03]">
                    <div className="space-y-3">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-gray-100 tracking-tighter">LOACHECK</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                            로스트아크 오픈 API를 활용한 캐릭터 검색 및 숙제 관리 도구입니다.
                            더 나은 게임 환경을 위해 매일 데이터를 동기화합니다.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <SocialIcon icon={<RiDiscordFill size={22} />} href="https://discord.com" color="hover:text-[#5865F2]" title="최철#5575" />
                            <SocialIcon icon={<RiGithubFill size={22} />} href="https://github.com/zxc8289/lostark_front" color="hover:text-white" />
                            <SocialIcon icon={<Mail size={20} />} href="mailto:zxc8289@gmail.com" color="hover:text-blue-400" />
                        </div>
                    </div>

                    {/* 사이트 맵 & 법적 고지 섹션 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-16">
                        <FooterNavGroup title="Service">    
                            <FooterNavLink href="/my-tasks">내 숙제</FooterNavLink>
                            <FooterNavLink href="/party-tasks">공격대 목록</FooterNavLink>
                        </FooterNavGroup>

                        <FooterNavGroup title="Legal">
                            <FooterNavLink href="/privacy">개인정보 처리방침</FooterNavLink>
                            <FooterNavLink href="/terms">이용약관</FooterNavLink>
                        </FooterNavGroup>

                        <FooterNavGroup title="Resources">
                            <FooterNavLink href="https://lostark.game.onstove.com/">로스트아크 공식</FooterNavLink>
                            <FooterNavLink href="https://developer-lostark.game.onstove.com/">Lostark API</FooterNavLink>
                        </FooterNavGroup>
                    </div>
                </div>

                <div className="pt-3 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-600 font-medium">
                            © 2026 LOACHECK. Designed & Developed by <span className="text-gray-400">최철</span>.
                        </p>
                        <p className="text-[9px] text-gray-700 leading-tight max-w-2xl">
                            Lost Ark is a trademark of Smilegate RPG, Inc. LOACHECK is an independent tool and is not affiliated with or endorsed by Smilegate RPG.
                            모든 게임 데이터와 이미지의 저작권은 Smilegate RPG에 귀속됩니다.
                        </p>
                    </div>

                </div>
            </div>
        </footer>
    );
}


function FooterNavGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{title}</span>
            <nav className="flex flex-col gap-2.5">{children}</nav>
        </div>
    );
}

function FooterNavLink({ href, children, highlight }: { href: string; children: React.ReactNode; highlight?: boolean }) {
    return (
        <a
            href={href}
            className={`text-[12px] transition-colors ${highlight ? "text-blue-400 font-bold hover:text-blue-300" : "text-gray-500 hover:text-gray-200"
                }`}
        >
            {children}
        </a>
    );
}

function SocialIcon({ icon, href, color, title }: { icon: React.ReactNode; href: string; color: string; title?: string }) {
    return (
        <a
            href={href}
            title={title} // 마우스를 올렸을 때 뜨는 툴팁 효과
            className={`text-gray-500 transition-all duration-200 ${color}`}
            target="_blank"
            rel="noreferrer"
        >
            {icon}
        </a>
    );
}