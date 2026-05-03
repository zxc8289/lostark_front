"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

// --- 타입 정의 ---
type PostStatus = "대기중" | "확인" | "답변완료";
type NoticeCategory = "New" | "Fix" | "Update" | "공지";

type Post = {
    id: string;
    title: string;
    content: string;
    author: string;
    authorImage?: string | null;
    isAnonymous: boolean;
    status: PostStatus;
    createdAt: string | null;
    updatedAt: string | null;
    canEdit?: boolean;
    canDelete?: boolean;
};

type Reply = {
    id: string;
    postId: string; // 공지사항의 경우 noticeId 역할을 겸함
    content: string;
    parentId?: string | null;
    author: string;
    authorImage?: string | null;
    isStaff: boolean;
    createdAt: string | null;
};

type Notice = {
    id: string;
    title: string;
    content: string;
    category: NoticeCategory;
    createdAt: string | null;
    updatedAt: string | null;
};

type TabType = "notice" | "support";

// --- Icons ---
const Icons = {
    Anonymous: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Lock: () => <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    Pencil: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
    X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    Shield: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Answer: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    Exclamation: () => <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    ChevronLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
    ArrowLeft: () => <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    Megaphone: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    ShieldCheck: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    ChevronDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    Check: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
};

// --- 유틸리티 함수 ---
function fmtDate(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function statusBadgeClass(status: PostStatus) {
    if (status === "답변완료") return "bg-green-900/30 border-green-700 text-green-400";
    if (status === "확인") return "bg-blue-900/30 border-blue-700 text-blue-400";
    return "bg-gray-700 border-gray-600 text-gray-400";
}

// ✨ Nav 컴포넌트의 업데이트 로그 색상에 맞춰 배지 색상 수정
function categoryBadgeClass(category?: string | null) {
    if (category === "New") return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
    if (category === "Fix") return "bg-red-500/20 border-red-500/30 text-red-400";
    if (category === "Update") return "bg-blue-500/20 border-blue-500/30 text-blue-400";
    return "bg-[#5B69FF]/20 border-[#5B69FF]/30 text-[#5B69FF]"; // 공지 및 기본값
}

function getGuestKey(postId: string) {
    try { return localStorage.getItem(`support_guest_key:${postId}`) || ""; } catch { return ""; }
}
function setGuestKey(postId: string, key: string) {
    try { localStorage.setItem(`support_guest_key:${postId}`, key); } catch { }
}

// --- ✨ 커스텀 드롭다운 컴포넌트 (TaskSidebar 레이드 드롭다운 디자인 적용) ---
function CategoryDropdown({ value, onChange, disabled = false }: { value: NoticeCategory, onChange: (val: NoticeCategory) => void, disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const categories: NoticeCategory[] = ["공지", "Update", "Fix", "New"];

    return (
        <div className="relative min-w-[130px]">
            <button
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg transition-all ${open ? 'border-[#5B69FF]/50 ring-1 ring-[#5B69FF]/50 bg-white/10' : 'hover:bg-white/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${categoryBadgeClass(value)}`}>{value}</span>
                <div className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                </div>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[50]">
                        <div className="flex flex-col gap-1 p-1.5">
                            {categories.map((c) => {
                                const isActive = c === value;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => { onChange(c); setOpen(false); }}
                                        className={`relative flex w-full items-center gap-2 rounded-md px-2 py-2 transition-all ${isActive ? "bg-[#5B69FF]/10" : "hover:bg-white/5"}`}
                                    >
                                        <div className={`w-4 h-4 flex items-center justify-center transition-colors ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                            <Icons.Check />
                                        </div>
                                        <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${categoryBadgeClass(c)}`}>{c}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// --- 공통 스켈레톤 UI ---
const CardSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#16181D] border border-white/5 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex justify-between"><div className="w-10 h-4 bg-gray-800 rounded" /><div className="w-16 h-3 bg-gray-800 rounded" /></div>
                <div className="w-3/4 h-5 bg-gray-800 rounded" />
                <div className="w-full h-10 bg-gray-800 rounded" />
                <div className="mt-auto pt-3 border-t border-gray-800 flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-gray-800" /><div className="w-16 h-3 bg-gray-800 rounded" /></div>
            </div>
        ))}
    </div>
);

const DetailSkeleton = () => (
    <div className="animate-pulse space-y-8">
        <div className="space-y-4">
            <div className="w-2/3 h-10 bg-gray-800 rounded-lg" />
            <div className="w-1/3 h-5 bg-gray-800 rounded" />
        </div>
        <div className="w-full h-48 bg-gray-800 rounded-xl" />
        <div className="space-y-4">
            <div className="w-20 h-6 bg-gray-800 rounded" />
            <div className="w-full h-24 bg-gray-800 rounded-xl" />
        </div>
    </div>
);

// --- 메인 컴포넌트 ---
function SupportPageContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();

    // 탭 및 공통 상태
    const [activeTab, setActiveTab] = useState<TabType>("notice");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const POSTS_PER_PAGE = 9;

    // 인증/어드민 상태
    const [adminSecret, setAdminSecret] = useState("");
    const isAdmin = useMemo(() => adminSecret.trim().length > 0, [adminSecret]);

    // 게시물/공지 목록 상태
    const [posts, setPosts] = useState<Post[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);

    // 상세 보기 상태
    const [openId, setOpenId] = useState<string | null>(null);
    const [openType, setOpenType] = useState<TabType | null>(null);
    const [openPost, setOpenPost] = useState<Post | null>(null);
    const [openNotice, setOpenNotice] = useState<Notice | null>(null);
    const [openReplies, setOpenReplies] = useState<Reply[]>([]);
    const [openLoading, setOpenLoading] = useState(false);

    // 작성 폼 상태
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [noticeCategory, setNoticeCategory] = useState<NoticeCategory>("공지");

    // 수정 폼 상태
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editAnonymous, setEditAnonymous] = useState(false);
    const [editCategory, setEditCategory] = useState<NoticeCategory>("공지");
    const [editSaving, setEditSaving] = useState(false);

    // 모달 및 댓글 상태
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replyAnonymous, setReplyAnonymous] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);

    // 초기 어드민 시크릿 로드
    useEffect(() => {
        const saved = localStorage.getItem("support_admin_secret");
        if (saved) setAdminSecret(saved);
    }, []);
    useEffect(() => {
        if (adminSecret) localStorage.setItem("support_admin_secret", adminSecret);
        else localStorage.removeItem("support_admin_secret");
    }, [adminSecret]);

    // 삭제 모달 스크롤 방지
    useEffect(() => {
        if (deleteModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
    }, [deleteModalOpen]);

    // URL 파라미터를 통한 상세 오픈 처리
    useEffect(() => {
        const queryPostId = searchParams.get("postId");
        const queryNoticeId = searchParams.get("noticeId");

        if (queryNoticeId && queryNoticeId !== openId) {
            setActiveTab("notice");
            openDetail(queryNoticeId, "notice");
        } else if (queryPostId && queryPostId !== openId) {
            setActiveTab("support");
            openDetail(queryPostId, "support");
        } else if (!queryPostId && !queryNoticeId) {
            closeDetail(false);
        }
    }, [searchParams]);

    // 리스트 불러오기
    async function fetchList() {
        setLoading(true);
        try {
            if (activeTab === "notice") {
                const res = await fetch("/api/notice", { cache: "no-store" });
                const json = await res.json();
                if (json.ok) setNotices(json.notices as Notice[]);
            } else {
                const res = await fetch("/api/support/posts", { cache: "no-store" });
                const json = await res.json();
                if (json.ok) setPosts(json.posts as Post[]);
            }
        } catch (e) { setErrMsg("불러오기 실패"); }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchList(); setCurrentPage(1); }, [activeTab]);

    // 작성 로직 통합
    async function submitItem() {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            if (activeTab === "notice") {
                const res = await fetch("/api/notice", {
                    method: "POST",
                    headers: { "content-type": "application/json", "x-admin-secret": adminSecret },
                    body: JSON.stringify({ title, content, category: noticeCategory }),
                });
                if (res.ok) {
                    setTitle(""); setContent(""); setNoticeCategory("공지");
                    await fetchList();
                }
            } else {
                const res = await fetch("/api/support/posts", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ title, content, isAnonymous }),
                });
                const json = await res.json();
                if (json.ok) {
                    if (json.guestKey) setGuestKey(json.id, json.guestKey);
                    setTitle(""); setContent(""); setIsAnonymous(false);
                    await fetchList();
                }
            }
        } catch (e) { alert("등록 실패"); }
        finally { setSaving(false); }
    }

    // 상세 보기 오픈 로직 통합
    async function openDetail(id: string, type: TabType) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setOpenId(id);
        setOpenType(type);
        setOpenLoading(true);
        try {
            if (type === "notice") {
                const res = await fetch(`/api/notice/${id}`, { cache: "no-store" });
                const json = await res.json();
                if (json.ok) {
                    setOpenNotice(json.notice);
                    // 공지사항에서도 댓글을 지원하도록 변경
                    setOpenReplies(json.replies || []);
                    setEditTitle(json.notice.title);
                    setEditContent(json.notice.content);
                    setEditCategory(json.notice.category);
                }
            } else {
                const guestKey = getGuestKey(id);
                const res = await fetch(`/api/support/posts/${id}`, {
                    cache: "no-store",
                    headers: guestKey ? { "x-guest-key": guestKey } : undefined,
                });
                const json = await res.json();
                if (json.ok) {
                    setOpenPost(json.post);
                    setOpenReplies(json.replies || []);
                    setEditTitle(json.post.title);
                    setEditContent(json.post.content);
                    setEditAnonymous(!!json.post.isAnonymous);
                }
            }
        } catch (e) { alert("상세 불러오기 실패"); }
        finally { setOpenLoading(false); }
    }

    function closeDetail(updateUrl = true) {
        setOpenId(null); setOpenType(null); setOpenPost(null); setOpenNotice(null); setOpenReplies([]);
        setReplyText(""); setEditMode(false); setReplyingTo(null);
        if (updateUrl) router.replace("/support");
    }

    // 수정 로직 통합
    async function saveEdit() {
        if (!openId || !openType || !editTitle.trim() || !editContent.trim()) return;
        setEditSaving(true);
        try {
            if (openType === "notice") {
                await fetch(`/api/notice/${openId}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json", "x-admin-secret": adminSecret },
                    body: JSON.stringify({ title: editTitle, content: editContent, category: editCategory }),
                });
            } else {
                const guestKey = getGuestKey(openId);
                await fetch(`/api/support/posts/${openId}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json", ...(guestKey ? { "x-guest-key": guestKey } : {}) },
                    body: JSON.stringify({ title: editTitle, content: editContent, isAnonymous: editAnonymous }),
                });
            }

            setEditMode(false);
            // 💡 openType 뒤에 ! 를 붙여줍니다
            await openDetail(openId, openType!);
            await fetchList();
        } finally { setEditSaving(false); }
    }

    // 삭제 로직 통합
    async function executeDelete() {
        if (!openId || !openType) return;
        setDeleteSaving(true);
        try {
            if (openType === "notice") {
                await fetch(`/api/notice/${openId}`, { method: "DELETE", headers: { "x-admin-secret": adminSecret } });
            } else {
                const guestKey = getGuestKey(openId);
                await fetch(`/api/support/posts/${openId}`, { method: "DELETE", headers: guestKey ? { "x-guest-key": guestKey } : undefined });
            }
            setDeleteModalOpen(false); closeDetail(); await fetchList();
        } finally { setDeleteSaving(false); }
    }

    async function submitReply() {
        if (!openId || !openType || !replyText.trim()) return;

        try {
            const headers: Record<string, string> = { "content-type": "application/json" };
            if (adminSecret.trim()) headers["x-admin-secret"] = adminSecret.trim();

            const url = openType === "notice"
                ? `/api/notice/${openId}/replies`
                : `/api/support/posts/${openId}/replies`;

            const res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    content: replyText,
                    isAnonymous: replyAnonymous,
                    author: session?.user?.name || "사용자",
                    authorImage: session?.user?.image || null,
                    parentId: replyingTo?.id || null
                }),
            });
            if (res.ok) {
                setReplyText(""); setReplyAnonymous(false); setReplyingTo(null);

                // 💡 openType 뒤에 ! 를 붙여줍니다
                await openDetail(openId, openType!);
            }
        } catch (e) { alert("등록 실패"); }
    }

    // 페이지네이션 처리
    const listData = activeTab === "notice" ? notices : posts;
    const totalPages = Math.ceil(listData.length / POSTS_PER_PAGE);
    const currentList = listData.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

    return (
        <div className="w-full text-white py-8 sm:py-12 min-h-screen bg-transparent">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-0">
                {!openId ? (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        {/* 헤더 및 탭 영역 */}
                        <div className="relative pb-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-800">
                            <div className="space-y-4 w-full">
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                    {activeTab === "notice" ? <><Icons.Megaphone /> <span>로아체크 소식</span></> : <><Icons.Answer /> <span>고객 지원 및 피드백</span></>}
                                </div>

                                <div className="flex justify-between items-end w-full">
                                    <div className="flex gap-6">
                                        <button
                                            onClick={() => { setActiveTab("notice"); closeDetail(); }}
                                            className={`text-xl sm:text-2xl font-bold pb-2 transition-colors ${activeTab === "notice" ? "text-white border-b-2 border-[#5B69FF]" : "text-gray-500 hover:text-gray-300"}`}
                                        >
                                            공지사항
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab("support"); closeDetail(); }}
                                            className={`text-xl sm:text-2xl font-bold pb-2 transition-colors ${activeTab === "support" ? "text-white border-b-2 border-[#5B69FF]" : "text-gray-500 hover:text-gray-300"}`}
                                        >
                                            문의 게시판
                                        </button>
                                    </div>

                                    {/* 관리자 키 입력 */}
                                    <div className="hidden sm:flex items-center gap-2 bg-[#16181D] border border-white/5 px-3 py-2 rounded-lg mb-2">
                                        <div className="text-gray-400"><Icons.ShieldCheck /></div>
                                        <input
                                            type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)}
                                            className="bg-transparent border-none text-gray-400 text-xs focus:ring-0 focus:outline-none w-20 focus:w-32 transition-all"
                                            placeholder="Admin Key" spellCheck={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 mb-4">
                            {activeTab === "notice" ? "로아체크의 최신 패치 노트와 공지사항을 확인하세요." : "자유롭게 건의사항이나 문의를 남겨주세요."}
                        </p>

                        {/* 작성 폼 영역 */}
                        {activeTab === "notice" && isAdmin && (
                            <div className="bg-[#16181D] border border-[#5B69FF]/30 shadow-[0_0_15px_rgba(91,105,255,0.1)] rounded-xl p-5 mb-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-sm font-bold text-[#5B69FF] flex items-center gap-2"><Icons.Pencil /> 공지사항 등록 (관리자)</label>
                                        <CategoryDropdown value={noticeCategory} onChange={setNoticeCategory} />
                                    </div>
                                    <input className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none" placeholder="제목을 입력해주세요." value={title} onChange={(e) => setTitle(e.target.value)} />
                                    <textarea className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none resize-none h-32" placeholder="공지 내용을 입력해주세요..." value={content} onChange={(e) => setContent(e.target.value)} />
                                    <div className="flex justify-end"><button onClick={submitItem} disabled={saving || !title.trim() || !content.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium">{saving ? "등록중..." : "등록하기"}</button></div>
                                </div>
                            </div>
                        )}

                        {activeTab === "support" && (
                            <div className="bg-[#16181D] border border-white/5 rounded-xl p-5 shadow-sm">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Icons.Pencil /> 새 문의 작성</label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                                                <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${isAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAnonymous ? "translate-x-5" : ""}`} />
                                            </div>
                                            <span className="text-xs text-gray-400">작성자 비공개</span>
                                        </label>
                                    </div>
                                    <input className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none" placeholder="제목을 입력해주세요." value={title} onChange={(e) => setTitle(e.target.value)} />
                                    <textarea className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none resize-none h-32" placeholder="문의 내용을 입력해주세요..." value={content} onChange={(e) => setContent(e.target.value)} />
                                    <div className="flex justify-end"><button onClick={submitItem} disabled={saving || !title.trim() || !content.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium">{saving ? "등록중..." : "등록하기"}</button></div>
                                </div>
                            </div>
                        )}

                        {/* 리스트 출력 영역 */}
                        <div>
                            {loading ? <CardSkeleton /> : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {currentList.map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => openDetail(item.id, activeTab)}
                                                className="text-left bg-[#16181D] border border-white/5 rounded-xl p-5 hover:border-gray-600 transition-colors flex flex-col gap-3 group"
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    {activeTab === "notice" ? (
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${categoryBadgeClass(item.category)}`}>{item.category}</span>
                                                    ) : (
                                                        <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(item.status)}`}>{item.status}</span>
                                                    )}
                                                    <span className="text-xs text-gray-500">{fmtDate(item.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                                    <p className="text-sm text-gray-400 line-clamp-2">{item.content}</p>
                                                </div>

                                                <div className="mt-auto pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500 w-full">
                                                    {activeTab === "notice" ? (
                                                        <><div className="w-5 h-5 rounded-full bg-[#5B69FF] flex items-center justify-center text-white"><Icons.ShieldCheck /></div> <span>로아체크 관리자</span></>
                                                    ) : (
                                                        item.isAnonymous ? <><Icons.Lock /> <span>비공개 회원</span></> : <><Avatar src={item.authorImage} alt={item.author} /> <span>{item.author}</span></>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* 통합 페이지네이션 */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center mt-10 mb-4">
                                            <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-sm">
                                                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 rounded-md flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30"><Icons.ChevronLeft /></button>
                                                <div className="flex items-center gap-0.5 px-1 border-x border-gray-700/50 mx-1">
                                                    {Array.from({ length: totalPages }).map((_, i) => (
                                                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-md text-sm font-medium transition-all ${currentPage === i + 1 ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}>{i + 1}</button>
                                                    ))}
                                                </div>
                                                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 rounded-md flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30"><Icons.ChevronRight /></button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    // ---------------- 상세 화면 ----------------
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button onClick={() => closeDetail()} className="text-[#5B69FF] hover:text-blue-400 flex items-center text-sm font-medium mb-8 transition-colors"><Icons.ArrowLeft /> 목록으로 돌아가기</button>

                        {openLoading || (!openPost && !openNotice) ? <DetailSkeleton /> : (
                            <>
                                <div className="mb-10">
                                    {editMode ? (
                                        <div className="space-y-4 mb-6 animate-in fade-in duration-200">
                                            <div className="flex gap-4">
                                                {openType === "notice" && (
                                                    <CategoryDropdown value={editCategory} onChange={setEditCategory} />
                                                )}
                                                <input
                                                    className="flex-1 w-full bg-[#16181D] border border-gray-700 text-white rounded-xl px-4 py-3 text-2xl font-bold transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF]"
                                                    value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목을 입력하세요"
                                                />
                                            </div>
                                            <textarea
                                                className="w-full bg-[#16181D] border border-gray-700 text-gray-200 rounded-xl px-4 py-3 h-60 transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF] placeholder-gray-600 resize-none leading-relaxed"
                                                value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="내용을 입력하세요" spellCheck={false}
                                            />
                                            <div className="flex justify-between items-center">
                                                {openType === "support" ? (
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" checked={editAnonymous} onChange={(e) => setEditAnonymous(e.target.checked)} />
                                                            <div className={`w-8 h-4 rounded-full transition-colors ${editAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${editAnonymous ? "translate-x-4" : ""}`} />
                                                        </div>
                                                        <span className="text-xs text-gray-400">비공개로 수정</span>
                                                    </label>
                                                ) : <div />}
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditMode(false)} className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors">취소</button>
                                                    <button onClick={saveEdit} disabled={editSaving} className="px-6 py-2 bg-[#5B69FF] hover:bg-[#4752C4] disabled:bg-gray-800 disabled:text-gray-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20">
                                                        {editSaving ? "저장 중..." : "수정 완료"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-6 leading-tight break-keep">{openType === "notice" ? openNotice?.title : openPost?.title}</h1>
                                            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 font-medium text-gray-300">
                                                        {openType === "notice" ? (
                                                            <><div className="w-5 h-5 rounded-full bg-[#5B69FF] flex items-center justify-center text-white"><Icons.ShieldCheck /></div> 로아체크</>
                                                        ) : (
                                                            openPost?.isAnonymous ? <><Icons.Lock /> <span>비공개</span></> : <><Avatar src={openPost?.authorImage} alt={openPost?.author || ""} /> {openPost?.author}</>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-500">|</span> <span className="text-gray-500">{fmtDate(openType === "notice" ? openNotice?.createdAt : openPost?.createdAt)}</span>

                                                    {openType === "notice" ? (
                                                        <span className={`px-2 py-0.5 rounded border text-xs ${categoryBadgeClass(openNotice!.category)} ml-2`}>{openNotice?.category}</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded border text-xs ${statusBadgeClass(openPost!.status)} ml-2`}>{openPost?.status}</span>
                                                    )}
                                                </div>

                                                {/* 수정/삭제 권한 버튼 */}
                                                {((openType === "notice" && isAdmin) || (openType === "support" && openPost?.canEdit)) && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditMode(true)} className="p-2 text-gray-400 hover:text-white transition-colors"><Icons.Pencil /></button>
                                                        <button onClick={() => setDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Icons.Trash /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-8 text-gray-300 whitespace-pre-wrap leading-relaxed">{openType === "notice" ? openNotice?.content : openPost?.content}</div>
                                        </>
                                    )}
                                </div>

                                {/* 댓글 영역 (문의 게시판 & 공지사항 통합 적용) */}
                                {!editMode && (
                                    <>
                                        <div className="space-y-5">
                                            {openReplies.filter(r => !r.parentId).map((parent) => (
                                                <div key={parent.id} className="space-y-2">
                                                    <div className={`rounded-xl border p-5 relative overflow-hidden transition-all ${parent.isStaff ? "bg-[#16181D]/80 border-[#5B69FF]/40" : "bg-[#16181D]/50 border-gray-800"}`}>
                                                        {parent.isStaff && <div className="absolute top-0 right-0 bg-[#5B69FF] text-[10px] font-bold px-3 py-1 rounded-bl-xl text-white">공식 답변</div>}
                                                        <div className="flex items-start gap-3 mb-3">
                                                            {parent.isStaff ? <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Icons.Shield /></div> : <Avatar src={parent.authorImage} alt={parent.author} sizeClass="w-10 h-10" />}
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-gray-200 text-sm">{parent.author}</div>
                                                                <div className="flex items-center gap-3 mt-0.5">
                                                                    <span className="text-xs text-gray-500">{fmtDate(parent.createdAt)}</span>
                                                                    <button onClick={() => { setReplyingTo({ id: parent.id, author: parent.author }); setTimeout(() => document.getElementById("reply-textarea")?.focus(), 50); }} className="text-[11px] font-medium text-gray-400 hover:text-white">답글달기</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-gray-300 pl-[52px] whitespace-pre-wrap">{parent.content}</div>
                                                    </div>

                                                    {openReplies.filter(child => child.parentId === parent.id).map(child => (
                                                        <div key={child.id} className="flex gap-2 pl-4 sm:pl-10">
                                                            <div className="flex-shrink-0 mt-2 text-gray-600">
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M5 2v10a2 2 0 002 2h10" /><path d="M14 11l3 3-3 3" /></svg>
                                                            </div>
                                                            <div className={`flex-1 rounded-xl border p-4 transition-all ${child.isStaff ? "bg-[#16181D]/60 border-[#5B69FF]/30" : "bg-[#0E1015]/80 border-gray-800/80"}`}>
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    {child.isStaff ? <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Icons.Shield /></div> : <Avatar src={child.authorImage} alt={child.author} sizeClass="w-8 h-8" />}
                                                                    <div className="flex flex-col">
                                                                        <div className="font-semibold text-gray-300 text-sm">{child.author}</div>
                                                                        <div className="text-[10px] text-gray-600">{fmtDate(child.createdAt)}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-gray-400 text-sm pl-[44px] leading-relaxed whitespace-pre-wrap">{child.content}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-10 mb-8">
                                            <div className={`bg-[#16181D] border rounded-xl overflow-hidden transition-all duration-300 ${isAdmin ? 'border-[#5B69FF]/50 shadow-[0_0_15px_rgba(91,105,255,0.1)]' : 'border-gray-800'}`}>
                                                <div className="bg-[#0E1015]/50 px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
                                                    <span className={`text-sm font-bold flex items-center gap-2 ${isAdmin ? 'text-[#5B69FF]' : 'text-gray-300'}`}>{isAdmin ? <Icons.Shield /> : <Icons.Answer />} {isAdmin ? '공식 답변 작성' : '댓글 남기기'}</span>
                                                </div>
                                                {replyingTo && (
                                                    <div className="bg-[#5B69FF]/10 border-b border-[#5B69FF]/20 px-5 py-2.5 flex items-center justify-between text-xs text-blue-300 animate-in fade-in slide-in-from-top-2">
                                                        <span><strong className="text-white">{replyingTo.author}</strong> 님에게 답글을 작성합니다.</span>
                                                        <button onClick={() => setReplyingTo(null)} className="hover:text-white p-1"><Icons.X /></button>
                                                    </div>
                                                )}
                                                <div className="p-5 pt-4">
                                                    <textarea id="reply-textarea" value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full bg-transparent text-white focus:outline-none placeholder-gray-600 resize-none h-24 text-[15px]" placeholder={replyingTo ? "답글을 입력해주세요..." : "자유롭게 댓글을 남겨주세요."} spellCheck={false} />
                                                    <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-800/50">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-gray-500">{isAdmin ? '관리자 권한으로 등록됩니다.' : '일반 사용자로 등록됩니다.'}</span>
                                                            {!isAdmin && (
                                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                    <div className="relative">
                                                                        <input type="checkbox" className="sr-only" checked={replyAnonymous} onChange={(e) => setReplyAnonymous(e.target.checked)} />
                                                                        <div className={`w-8 h-4 rounded-full transition-colors ${replyAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${replyAnonymous ? "translate-x-4" : ""}`} />
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">비공개</span>
                                                                </label>
                                                            )}
                                                        </div>
                                                        <button onClick={submitReply} disabled={!replyText.trim()} className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${isAdmin ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'bg-gray-700 text-gray-200'}`}>{replyingTo ? '답글 등록' : '댓글 등록'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 통합 삭제 모달 */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1E2028] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit text-red-500"><Icons.Exclamation /></div>
                        <h3 className="text-lg font-bold text-white mb-2">{openType === "notice" ? "공지사항 삭제" : "게시글 삭제"}</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">정말로 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} disabled={deleteSaving} className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">취소</button>
                            <button onClick={executeDelete} disabled={deleteSaving} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold">{deleteSaving ? "삭제중..." : "삭제하기"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Avatar 컴포넌트의 undefined 허용 처리
function Avatar({ src, alt, sizeClass = "w-5 h-5" }: { src?: string | null | undefined; alt: string; sizeClass?: string }) {
    if (!src) return <div className={`${sizeClass} rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border border-white/10`}><Icons.Lock /></div>;
    return <img src={src} alt={alt} className={`${sizeClass} rounded-full object-cover border border-white/10`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}

export default function SupportPage() {
    return (
        <Suspense fallback={
            <div className="w-full text-white py-8 sm:py-12 min-h-screen bg-transparent">
                <div className="mx-auto max-w-7xl px-4 sm:px-0">
                    <div className="animate-pulse space-y-8">
                        <div className="w-48 h-8 bg-gray-800 rounded-lg mb-10" />
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        }>
            <SupportPageContent />
        </Suspense>
    );
}