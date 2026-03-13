"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

// --- 타입 정의 ---
type PostStatus = "대기중" | "확인" | "답변완료";

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
    isGuestPost?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
};

type Reply = {
    id: string;
    postId: string;
    content: string;
    parentId?: string | null;
    author: string;
    authorImage?: string | null;
    isStaff: boolean;
    createdAt: string | null;
};

// --- Icons ---
const Icons = {
    Grid: () => <svg className="w-5 h-5 relative -top-[1.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4V6zm10 0h6v6h-6V6zM4 16h6v6H4v-6zm10 0h6v6h-6v-6z" /></svg>,
    List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
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
};

// --- 유틸리티 함수 ---
function fmtDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function statusBadgeClass(status: PostStatus) {
    if (status === "답변완료") return "bg-green-900/30 border-green-700 text-green-400";
    if (status === "확인") return "bg-blue-900/30 border-blue-700 text-blue-400";
    return "bg-gray-700 border-gray-600 text-gray-400";
}

function getGuestKey(postId: string) {
    try { return localStorage.getItem(`support_guest_key:${postId}`) || ""; } catch { return ""; }
}
function setGuestKey(postId: string, key: string) {
    try { localStorage.setItem(`support_guest_key:${postId}`, key); } catch { }
}

// --- ✨ 스켈레톤 UI 컴포넌트 ---
const ListSkeleton = () => (
    <div className="bg-[#16181D] border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-5 bg-gray-800 rounded" />
                    <div className="w-48 h-5 bg-gray-800 rounded" />
                </div>
                <div className="w-20 h-4 bg-gray-800 rounded" />
            </div>
        ))}
    </div>
);

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

// --- 메인 페이지 본문 ---
function SupportPageContent() {
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const POSTS_PER_PAGE = 9;

    const { data: session } = useSession();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);

    const [openId, setOpenId] = useState<string | null>(null);
    const [openPost, setOpenPost] = useState<Post | null>(null);
    const [openReplies, setOpenReplies] = useState<Reply[]>([]);
    const [openLoading, setOpenLoading] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editAnonymous, setEditAnonymous] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const [adminSecret, setAdminSecret] = useState("");
    const [replyText, setReplyText] = useState("");
    const isAdmin = useMemo(() => adminSecret.trim().length > 0, [adminSecret]);
    const [replyAnonymous, setReplyAnonymous] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (deleteModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
    }, [deleteModalOpen]);

    useEffect(() => {
        const saved = localStorage.getItem("support_admin_secret");
        if (saved) setAdminSecret(saved);
    }, []);
    useEffect(() => {
        if (adminSecret) localStorage.setItem("support_admin_secret", adminSecret);
        else localStorage.removeItem("support_admin_secret");
    }, [adminSecret]);

    async function refresh() {
        setLoading(true);
        try {
            const res = await fetch("/api/support/posts", { cache: "no-store" });
            const json = await res.json();
            if (json.ok) setPosts(json.posts as Post[]);
        } catch (e) { setErrMsg("불러오기 실패"); }
        finally { setLoading(false); }
    }

    useEffect(() => { refresh(); }, []);

    useEffect(() => {
        const queryPostId = searchParams.get("postId");
        if (queryPostId && queryPostId !== openId) openDetail(queryPostId);
    }, [searchParams]);

    async function submitPost() {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/support/posts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title, content, isAnonymous }),
            });
            const json = await res.json();
            if (json.ok) {
                if (json.guestKey) setGuestKey(json.id, json.guestKey);
                setTitle(""); setContent(""); setIsAnonymous(false);
                await refresh();
            }
        } catch (e) { setErrMsg("등록 실패"); }
        finally { setSaving(false); }
    }

    async function openDetail(id: string) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setOpenId(id);
        setOpenLoading(true);
        try {
            const guestKey = getGuestKey(id);
            const res = await fetch(`/api/support/posts/${id}`, {
                cache: "no-store",
                headers: guestKey ? { "x-guest-key": guestKey } : undefined,
            });
            const json = await res.json();
            if (json.ok) {
                setOpenPost(json.post);
                setOpenReplies(json.replies);
                setEditTitle(json.post.title);
                setEditContent(json.post.content);
                setEditAnonymous(!!json.post.isAnonymous);
                router.refresh();
            }
        } catch (e) { setErrMsg("상세 불러오기 실패"); }
        finally { setOpenLoading(false); }
    }

    function closeDetail() {
        setOpenId(null); setOpenPost(null); setOpenReplies([]);
        setReplyText(""); setEditMode(false); setReplyingTo(null);
        router.replace("/support");
    }

    async function saveEdit() {
        if (!openId || !editTitle.trim() || !editContent.trim()) return;
        setEditSaving(true);
        try {
            const guestKey = getGuestKey(openId);
            await fetch(`/api/support/posts/${openId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json", ...(guestKey ? { "x-guest-key": guestKey } : {}) },
                body: JSON.stringify({ title: editTitle, content: editContent, isAnonymous: editAnonymous }),
            });
            setEditMode(false); await openDetail(openId); await refresh();
        } finally { setEditSaving(false); }
    }

    async function executeDelete() {
        if (!openId) return;
        setDeleteSaving(true);
        try {
            const guestKey = getGuestKey(openId);
            await fetch(`/api/support/posts/${openId}`, {
                method: "DELETE",
                headers: guestKey ? { "x-guest-key": guestKey } : undefined,
            });
            setDeleteModalOpen(false); closeDetail(); await refresh();
        } finally { setDeleteSaving(false); }
    }

    async function submitReply() {
        if (!openId || !replyText.trim()) return;
        try {
            const headers: Record<string, string> = { "content-type": "application/json" };
            if (adminSecret.trim()) headers["x-admin-secret"] = adminSecret.trim();
            const res = await fetch(`/api/support/posts/${openId}/replies`, {
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
                await openDetail(openId);
            }
        } catch (e) { setErrMsg("등록 실패"); }
    }

    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    const currentPosts = posts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

    return (
        <div className="w-full text-white py-8 sm:py-12 min-h-screen bg-transparent">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-0">
                {!openId ? (
                    <div className="animate-in fade-in duration-300 space-y-8">
                        <div className="relative pb-3">
                            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                        <Icons.Answer /> <span>고객 지원 및 피드백</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">문의 게시판</h1>
                                    <p className="text-sm text-gray-400 max-w-lg leading-relaxed">자유롭게 건의사항이나 문의를 남겨주세요.</p>
                                </div>
                                <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                                    <button onClick={() => setViewMode("card")} className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${viewMode === "card" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}><Icons.Grid /></button>
                                    <button onClick={() => setViewMode("list")} className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${viewMode === "list" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}><Icons.List /></button>
                                </div>
                            </div>
                        </div>

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
                                <div className="flex justify-end"><button onClick={submitPost} disabled={saving || !title.trim() || !content.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium">{saving ? "등록중..." : "등록하기"}</button></div>
                            </div>
                        </div>

                        {/* ✨ 목록 스케켈레톤 적용 */}
                        <div>
                            {loading ? (
                                viewMode === "card" ? <CardSkeleton /> : <ListSkeleton />
                            ) : (
                                <>
                                    {viewMode === "card" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {currentPosts.map((post) => (
                                                <button key={post.id} onClick={() => openDetail(post.id)} className="text-left bg-[#16181D] border border-white/5 rounded-xl p-5 hover:border-gray-600 transition-colors flex flex-col gap-3 group">
                                                    <div className="flex justify-between items-start w-full">
                                                        <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(post.status)}`}>{post.status}</span>
                                                        <span className="text-xs text-gray-500">{fmtDate(post.createdAt)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">{post.title}</h3>
                                                        <p className="text-sm text-gray-400 line-clamp-2">{post.content}</p>
                                                    </div>
                                                    <div className="mt-auto pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500 w-full">
                                                        {post.isAnonymous ? <><Icons.Lock /> <span>비공개 회원</span></> : <><Avatar src={post.authorImage} alt={post.author} /> <span>{post.author}</span></>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-[#16181D] border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
                                            {currentPosts.map((post) => (
                                                <div key={post.id} onClick={() => openDetail(post.id)} className="px-6 py-4 hover:bg-gray-800/30 flex items-center justify-between cursor-pointer group">
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(post.status)}`}>{post.status}</span>
                                                        <span className="text-sm text-gray-200 group-hover:text-blue-400 transition-colors">{post.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">{post.isAnonymous ? <Icons.Lock /> : <Avatar src={post.authorImage} alt={post.author} />} {post.author}</div>
                                                        <div className="text-xs text-gray-500">{fmtDate(post.createdAt)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button onClick={closeDetail} className="text-[#5B69FF] hover:text-blue-400 flex items-center text-sm font-medium mb-8 transition-colors"><Icons.ArrowLeft /> 목록으로 돌아가기</button>

                        {/* ✨ 상세 페이지 스케켈레톤 적용 */}
                        {openLoading || !openPost ? <DetailSkeleton /> : (
                            <>
                                <div className="mb-10">
                                    {editMode ? (
                                        <div className="space-y-4 mb-6 animate-in fade-in duration-200">
                                            {/* 제목 수정 인풋 */}
                                            <input
                                                className="w-full bg-[#16181D] border border-gray-700 text-white rounded-xl px-4 py-3 text-2xl font-bold transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] placeholder-gray-600"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="제목을 입력하세요"
                                            />
                                            {/* 내용 수정 텍스트에어리어 */}
                                            <textarea
                                                className="w-full bg-[#16181D] border border-gray-700 text-gray-200 rounded-xl px-4 py-3 h-60 transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] placeholder-gray-600 resize-none leading-relaxed"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                placeholder="내용을 입력하세요"
                                                spellCheck={false}
                                            />
                                            <div className="flex justify-between items-center">
                                                {/* 익명 설정 토글 (수정 시에도 유지) */}
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={editAnonymous} onChange={(e) => setEditAnonymous(e.target.checked)} />
                                                        <div className={`w-8 h-4 rounded-full transition-colors ${editAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${editAnonymous ? "translate-x-4" : ""}`} />
                                                    </div>
                                                    <span className="text-xs text-gray-400">비공개로 수정</span>
                                                </label>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditMode(false)}
                                                        className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={editSaving}
                                                        className="px-6 py-2 bg-[#5B69FF] hover:bg-[#4752C4] disabled:bg-gray-800 disabled:text-gray-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                                                    >
                                                        {editSaving ? "저장 중..." : "수정 완료"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-6 leading-tight break-keep">{openPost.title}</h1>
                                            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 font-medium text-gray-300">{openPost.isAnonymous ? <Icons.Lock /> : <Avatar src={openPost.authorImage} alt={openPost.author} />} {openPost.author}</div>
                                                    <span className="text-gray-500">|</span> <span className="text-gray-500">{fmtDate(openPost.createdAt)}</span>
                                                    <span className={`px-2 py-0.5 rounded border text-xs ${statusBadgeClass(openPost.status)} ml-2`}>{openPost.status}</span>
                                                </div>
                                                {openPost.canEdit && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditMode(true)} className="p-2 text-gray-400 hover:text-white transition-colors"><Icons.Pencil /></button>
                                                        <button onClick={() => setDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Icons.Trash /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-8 text-gray-300 whitespace-pre-wrap leading-relaxed">{openPost.content}</div>
                                        </>
                                    )}
                                </div>

                                {/* 댓글 리스트 */}
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
                                                <div className="text-gray-300 pl-[52px]">{parent.content}</div>
                                            </div>

                                            {openReplies.filter(child => child.parentId === parent.id).map(child => (
                                                <div key={child.id} className="flex gap-2 pl-4 sm:pl-10">
                                                    <div className="flex-shrink-0 mt-4 text-gray-600">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l4 4 4-4" /><path d="M5 4v9a2 2 0 002 2h6" /></svg>
                                                    </div>
                                                    <div className={`flex-1 rounded-xl border p-4 transition-all ${child.isStaff ? "bg-[#16181D]/60 border-[#5B69FF]/30" : "bg-[#0E1015]/80 border-gray-800/80"}`}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            {child.isStaff ? <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Icons.Shield /></div> : <Avatar src={child.authorImage} alt={child.author} sizeClass="w-8 h-8" />}
                                                            <div className="flex flex-col"><div className="font-semibold text-gray-300 text-sm">{child.author} {child.isStaff && <span className="text-[#5B69FF] ml-1 text-[10px] font-bold">공식 답변</span>}</div><div className="text-[10px] text-gray-600">{fmtDate(child.createdAt)}</div></div>
                                                        </div>
                                                        <div className="text-gray-400 text-sm pl-[44px]">{child.content}</div>
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
                                            <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} className="bg-transparent border border-gray-700 text-gray-400 text-xs rounded-md px-3 py-1.5 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none w-24 focus:w-36 transition-all text-right" placeholder="Admin Key" spellCheck={false} />
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
                    </div>
                )}
            </div>

            {/* 삭제 확인 모달 */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1E2028] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit text-red-500"><Icons.Exclamation /></div>
                        <h3 className="text-lg font-bold text-white mb-2">게시글 삭제</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">정말로 이 게시글을 삭제하시겠습니까?<br />삭제된 게시글은 복구할 수 없습니다.</p>
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

// ✨ 컴포넌트 하단에 Suspense 래퍼 추가 (빌드 시 뼈대 역할)
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

function Avatar({ src, alt, sizeClass = "w-5 h-5" }: { src?: string | null; alt: string; sizeClass?: string }) {
    if (!src) return <div className={`${sizeClass} rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border border-white/10`}><Icons.Lock /></div>;
    return <img src={src} alt={alt} className={`${sizeClass} rounded-full object-cover border border-white/10`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}