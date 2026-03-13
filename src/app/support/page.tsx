"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

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
    author: string;
    authorImage?: string | null;
    isStaff: boolean;
    createdAt: string | null;
};

// --- Icons ---
const Icons = {
    Grid: () => (
        <svg className="w-5 h-5 relative -top-[1.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4V6zm10 0h6v6h-6V6zM4 16h6v6H4v-6zm10 0h6v6h-6v-6z" />
        </svg>
    ),
    List: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    ),
    Anonymous: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Lock: () => (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    ),
    Pencil: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    ),
    Trash: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
    ),
    X: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    Shield: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    Question: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Answer: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
    ),
    Exclamation: () => (
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    ),
    ChevronRight: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    ),
    ArrowLeft: () => (
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
    ),
};

function fmtDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
}

function statusBadgeClass(status: PostStatus) {
    if (status === "답변완료") return "bg-green-900/30 border-green-700 text-green-400";
    if (status === "확인") return "bg-blue-900/30 border-blue-700 text-blue-400";
    return "bg-gray-700 border-gray-600 text-gray-400";
}

function guestKeyStorageKey(postId: string) {
    return `support_guest_key:${postId}`;
}
function getGuestKey(postId: string) {
    try {
        return localStorage.getItem(guestKeyStorageKey(postId)) || "";
    } catch {
        return "";
    }
}
function setGuestKey(postId: string, key: string) {
    try {
        localStorage.setItem(guestKeyStorageKey(postId), key);
    } catch { }
}

export default function SupportPage() {
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

    // 상세 모달 -> 상세 페이지 뷰 상태로 사용
    const [openId, setOpenId] = useState<string | null>(null);
    const [openPost, setOpenPost] = useState<Post | null>(null);
    const [openReplies, setOpenReplies] = useState<Reply[]>([]);
    const [openLoading, setOpenLoading] = useState(false);

    // 수정 모드
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editAnonymous, setEditAnonymous] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    // 삭제 관련 상태 (삭제만 모달 형태 유지)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);

    // 관리자
    const [adminSecret, setAdminSecret] = useState("");
    const [replyText, setReplyText] = useState("");
    const isAdmin = useMemo(() => adminSecret.trim().length > 0, [adminSecret]);

    useEffect(() => {
        if (deleteModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
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
        setErrMsg(null);
        try {
            const res = await fetch("/api/support/posts", { cache: "no-store" });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "불러오기 실패");
            setPosts(json.posts as Post[]);
        } catch (e: any) {
            setErrMsg(e?.message || "불러오기 실패");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function submitPost() {
        if (!title.trim() || !content.trim()) return;

        setSaving(true);
        setErrMsg(null);
        setInfoMsg(null);

        try {
            const res = await fetch("/api/support/posts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title, content, isAnonymous }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "등록 실패");

            if (json.guestKey && json.id) {
                setGuestKey(String(json.id), String(json.guestKey));
                setInfoMsg("비회원 글로 등록되었습니다. 이 브라우저에서 수정/삭제가 가능합니다.");
            } else {
                setInfoMsg("등록되었습니다.");
            }

            setTitle("");
            setContent("");
            setIsAnonymous(false);
            await refresh();
        } catch (e: any) {
            setErrMsg(e?.message || "등록 실패");
        } finally {
            setSaving(false);
        }
    }

    async function openDetail(id: string) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setOpenId(id);
        setOpenLoading(true);
        setOpenPost(null);
        setOpenReplies([]);
        setEditMode(false);
        setDeleteModalOpen(false);

        try {
            const guestKey = getGuestKey(id);
            const res = await fetch(`/api/support/posts/${id}`, {
                cache: "no-store",
                headers: guestKey ? { "x-guest-key": guestKey } : undefined,
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "상세 불러오기 실패");

            const p = json.post as Post;
            setOpenPost(p);
            setOpenReplies(json.replies as Reply[]);

            setEditTitle(p.title);
            setEditContent(p.content);
            setEditAnonymous(!!p.isAnonymous);
        } catch (e: any) {
            setErrMsg(e?.message || "상세 불러오기 실패");
        } finally {
            setOpenLoading(false);
        }
    }

    function closeDetail() {
        setOpenId(null);
        setOpenPost(null);
        setOpenReplies([]);
        setReplyText("");
        setEditMode(false);
        setDeleteModalOpen(false);
    }

    const canEdit = useMemo(() => {
        if (!openId || !openPost) return false;
        if (openPost.canEdit) return true;
        return !!(openPost.isGuestPost && getGuestKey(openId));
    }, [openId, openPost]);

    async function saveEdit() {
        if (!openId) return;
        if (!editTitle.trim() || !editContent.trim()) return;

        setEditSaving(true);
        setErrMsg(null);
        try {
            const guestKey = getGuestKey(openId);
            const res = await fetch(`/api/support/posts/${openId}`, {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    ...(guestKey ? { "x-guest-key": guestKey } : {}),
                },
                body: JSON.stringify({
                    title: editTitle,
                    content: editContent,
                    isAnonymous: editAnonymous,
                }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "수정 실패");

            setEditMode(false);
            await openDetail(openId);
            await refresh();
            setInfoMsg("수정되었습니다.");
        } catch (e: any) {
            setErrMsg(e?.message || "수정 실패");
        } finally {
            setEditSaving(false);
        }
    }

    async function executeDelete() {
        if (!openId) return;

        setDeleteSaving(true);
        setErrMsg(null);
        try {
            const guestKey = getGuestKey(openId);
            const res = await fetch(`/api/support/posts/${openId}`, {
                method: "DELETE",
                headers: guestKey ? { "x-guest-key": guestKey } : undefined,
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "삭제 실패");

            setDeleteModalOpen(false);
            closeDetail();
            await refresh();
            setInfoMsg("삭제되었습니다.");
        } catch (e: any) {
            setErrMsg(e?.message || "삭제 실패");
        } finally {
            setDeleteSaving(false);
        }
    }

    async function submitReply() {
        if (!openId || !replyText.trim()) return;

        try {
            const res = await fetch(`/api/support/posts/${openId}/replies`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-admin-secret": adminSecret.trim(),
                },
                body: JSON.stringify({ content: replyText }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error || "답글 등록 실패");

            setReplyText("");
            await openDetail(openId);
            await refresh();
            setInfoMsg("답글이 등록되었습니다.");
        } catch (e: any) {
            setErrMsg(e?.message || "답글 등록 실패");
        }
    }

    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    const currentPosts = posts.slice(
        (currentPage - 1) * POSTS_PER_PAGE,
        currentPage * POSTS_PER_PAGE
    );

    return (
        <div className="w-full text-white py-8 sm:py-12 min-h-screen bg-transparent">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-0">

                {/* 리스트 및 작성 뷰 (!openId 일 때 렌더링) */}
                {!openId ? (
                    <div className="animate-in fade-in duration-300 space-y-8">
                        {/* 상단 헤더 */}
                        <div className="relative pb-3">
                            <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none" />
                            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                        </svg>
                                        <span>고객 지원 및 피드백</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                        문의 게시판
                                    </h1>
                                    <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                                        자유롭게 건의사항이나 문의를 남겨주세요.
                                    </p>
                                </div>
                                <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                                    <button onClick={() => setViewMode("card")} className={`w-9 h-9 rounded-md transition-all flex items-center justify-center focus:outline-none ${viewMode === "card" ? "bg-gray-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`} title="카드형 보기"><Icons.Grid /></button>
                                    <button onClick={() => setViewMode("list")} className={`w-9 h-9 rounded-md transition-all flex items-center justify-center focus:outline-none ${viewMode === "list" ? "bg-gray-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`} title="리스트형 보기"><Icons.List /></button>
                                </div>
                            </div>
                        </div>

                        {/* 작성 폼 */}
                        <div className="bg-[#16181D] border border-white/5 rounded-xl p-5 shadow-sm">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        <Icons.Pencil /> 새 문의 작성
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                                            <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${isAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAnonymous ? "translate-x-5" : ""}`} />
                                        </div>
                                        <span className="text-xs text-gray-400">작성자 비공개</span>
                                    </label>
                                </div>
                                <input className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none placeholder-gray-600 transition-all hover:border-white/20" placeholder="제목을 입력해주세요." value={title} onChange={(e) => setTitle(e.target.value)} />
                                <textarea className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none placeholder-gray-600 resize-none h-32 transition-all hover:border-white/20" placeholder="문의 내용을 입력해주세요..." value={content} onChange={(e) => setContent(e.target.value)} />
                                <div className="flex justify-end">
                                    <button onClick={submitPost} disabled={saving || !title.trim() || !content.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                                        {saving ? "등록중..." : "등록하기"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 목록 */}
                        <div>
                            {loading ? (
                                <div className="text-gray-500 text-sm py-8 text-center">불러오는 중...</div>
                            ) : (
                                <>
                                    {viewMode === "card" && (
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
                                                        {post.isAnonymous ? (
                                                            <><Icons.Lock /> <span>비공개 회원</span></>
                                                        ) : post.isGuestPost ? (
                                                            <><Icons.Pencil /> <span>{post.author}</span></>
                                                        ) : (
                                                            <><Avatar src={post.authorImage} alt={post.author} /> <span>{post.author}</span></>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {viewMode === "list" && (
                                        <div className="bg-[#16181D] border border-gray-700 rounded-xl overflow-hidden">
                                            <div className="hidden sm:flex bg-gray-800/50 text-sm font-semibold text-gray-400 border-b border-gray-700 px-6 py-3">
                                                <div className="w-16 text-center">상태</div>
                                                <div className="flex-1 px-4">제목</div>
                                                <div className="w-28 text-center">작성자</div>
                                                <div className="w-24 text-center">날짜</div>
                                            </div>
                                            <div className="divide-y divide-gray-700">
                                                {currentPosts.map((post) => (
                                                    <div key={post.id} className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-800/30 transition-colors gap-2 sm:gap-0">
                                                        <div className="flex sm:hidden justify-between text-xs text-gray-500 mb-1">
                                                            <span className={`px-1.5 rounded border ${statusBadgeClass(post.status)}`}>{post.status}</span>
                                                            <span>{fmtDate(post.createdAt)}</span>
                                                        </div>
                                                        <div className="hidden sm:block w-16 text-center">
                                                            <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(post.status)}`}>{post.status}</span>
                                                        </div>
                                                        <button onClick={() => openDetail(post.id)} className="flex-1 sm:px-4 min-w-0 text-left group">
                                                            <h3 className="text-sm sm:text-base font-medium text-gray-200 group-hover:text-blue-400 truncate">{post.title}</h3>
                                                            <p className="text-xs text-gray-500 truncate sm:hidden">{post.content}</p>
                                                        </button>
                                                        <div className="flex items-center justify-between sm:contents mt-2 sm:mt-0">
                                                            <div className="w-28 text-sm text-gray-400 sm:text-center flex items-center sm:justify-center gap-2">
                                                                {post.isAnonymous ? <><Icons.Lock /> <span>비공개 회원</span></> : post.isGuestPost ? <><Icons.Pencil /> <span>{post.author}</span></> : <><Avatar src={post.authorImage} alt={post.author} /> <span>{post.author}</span></>}
                                                            </div>
                                                            <div className="hidden sm:block w-24 text-sm text-gray-500 text-center">{fmtDate(post.createdAt)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {totalPages > 1 && (
                                        <div className="flex justify-center mt-10 mb-4">
                                            <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-sm">
                                                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:hover:bg-transparent"><Icons.ChevronLeft /></button>
                                                <div className="flex items-center gap-0.5 px-1 border-x border-gray-700/50 mx-1">
                                                    {Array.from({ length: totalPages }).map((_, i) => (
                                                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-medium transition-all ${currentPage === i + 1 ? "bg-gray-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>{i + 1}</button>
                                                    ))}
                                                </div>
                                                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:hover:bg-transparent"><Icons.ChevronRight /></button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    /* 📌 상세 페이지 뷰 (모달 대신 화면 교체) */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={closeDetail}
                            className="text-[#5B69FF] hover:text-blue-400 flex items-center text-sm font-medium mb-8 transition-colors"
                        >
                            <Icons.ArrowLeft /> 목록으로 돌아가기
                        </button>

                        {openLoading || !openPost ? (
                            <div className="animate-pulse space-y-6">
                                <div className="h-10 bg-gray-800 rounded-lg w-3/4"></div>
                                <div className="flex gap-4">
                                    <div className="h-6 bg-gray-800 rounded-full w-32"></div>
                                    <div className="h-6 bg-gray-800 rounded-full w-24"></div>
                                </div>
                                <div className="h-40 bg-gray-800 rounded-xl w-full mt-6"></div>
                            </div>
                        ) : (
                            <>
                                {/* 본문 영역 */}
                                <div className="mb-10">
                                    {editMode ? (
                                        <div className="space-y-4 mb-6">
                                            <input className="w-full bg-[#16181D] border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none text-2xl font-bold" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" />
                                            <textarea className="w-full bg-[#16181D] border border-gray-700 text-gray-200 rounded-xl px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none resize-none h-40" value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="내용" />
                                            <div className="flex justify-between items-center">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 select-none">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={editAnonymous} onChange={(e) => setEditAnonymous(e.target.checked)} />
                                                        <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${editAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editAnonymous ? "translate-x-5" : ""}`} />
                                                    </div>
                                                    익명으로 수정
                                                </label>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditMode(false); setEditTitle(openPost.title); setEditContent(openPost.content); setEditAnonymous(!!openPost.isAnonymous); }} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">취소</button>
                                                    <button onClick={saveEdit} disabled={editSaving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                                                        {editSaving ? "저장중..." : "저장"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-6 leading-tight break-keep">
                                                {openPost.title}
                                            </h1>
                                            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
                                                <div className="flex items-center gap-3 text-sm">
                                                    {openPost.isAnonymous ? (
                                                        <div className="flex items-center gap-2 font-medium text-gray-300">
                                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><Icons.Lock /></div>
                                                            비공개 회원
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 font-medium text-gray-300">
                                                            {openPost.authorImage ? (
                                                                <img src={openPost.authorImage} alt={openPost.author} className="w-8 h-8 rounded-full" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><Icons.Pencil /></div>
                                                            )}
                                                            {openPost.author}
                                                        </div>
                                                    )}
                                                    <span className="text-gray-500 flex items-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                        {fmtDate(openPost.createdAt)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded border text-xs ${statusBadgeClass(openPost.status)} ml-2`}>
                                                        {openPost.status}
                                                    </span>
                                                </div>

                                                {/* 수정/삭제 버튼 */}
                                                {canEdit && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setEditMode(true)} className="p-2 text-gray-400 hover:text-white transition-colors" title="수정"><Icons.Pencil /></button>
                                                        <button onClick={() => setDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="삭제"><Icons.Trash /></button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-8 text-gray-300 whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base">
                                                {openPost.content}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 답변 리스트 */}
                                <div className="space-y-6">
                                    {openReplies.map((reply) => (
                                        <div key={reply.id} className={`rounded-xl border p-6 relative overflow-hidden transition-all ${reply.isStaff ? "bg-[#16181D]/80 border-[#5B69FF]/40" : "bg-[#16181D]/50 border-gray-800"}`}>
                                            {reply.isStaff && (
                                                <div className="absolute top-0 right-0 bg-[#5B69FF] text-[10px] font-bold px-3 py-1 rounded-bl-xl text-white tracking-wider">
                                                    OFFICIAL RESPONSE
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mb-4">
                                                {reply.isStaff ? (
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Icons.Shield /></div>
                                                ) : reply.authorImage ? (
                                                    <img src={reply.authorImage} alt={reply.author} className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"><Icons.Pencil /></div>
                                                )}

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-200">{reply.author}</span>
                                                        {reply.isStaff && <span className="text-blue-400"><Icons.Shield /></span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{fmtDate(reply.createdAt)}</div>
                                                </div>
                                            </div>
                                            <div className="text-gray-300 whitespace-pre-wrap text-[15px] leading-relaxed">
                                                {reply.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 답변 작성 영역 (관리자 전용) */}
                                <div className="mt-10 mb-8">
                                    <h3 className="text-lg font-bold text-white mb-4">Add to discussion</h3>
                                    <div className="bg-[#16181D] border border-gray-800 rounded-xl overflow-hidden">
                                        <div className="bg-[#0E1015]/50 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><Icons.Shield /> 관리자 권한 확인</span>
                                            <input
                                                type="password"
                                                className="bg-[#0E1015] border border-gray-700 text-white text-xs rounded px-3 py-1.5 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none w-28 focus:w-40 transition-all text-right"
                                                placeholder="Admin Key"
                                                value={adminSecret}
                                                onChange={(e) => setAdminSecret(e.target.value)}
                                            />
                                        </div>
                                        <div className="p-5">
                                            <textarea
                                                className="w-full bg-[#0E1015] border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none placeholder-gray-600 resize-none h-28 text-sm transition-colors"
                                                placeholder={isAdmin ? "답변을 작성해주세요... (Markdown 지원)" : "Admin Key를 입력해야 답변 작성이 가능합니다."}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                disabled={!isAdmin}
                                            />
                                            <div className="flex justify-between items-center mt-4">
                                                <span className="text-xs text-gray-500 pl-1">{isAdmin ? "작성 모드 활성화됨" : ""}</span>
                                                <button
                                                    onClick={submitReply}
                                                    disabled={!replyText.trim() || !isAdmin}
                                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors shadow-lg"
                                                >
                                                    Post Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 삭제 확인 모달 (Z-INDEX 최상단, 기존 유지) */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1E2028] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                                <Icons.Exclamation />
                            </div>
                            <h3 className="text-lg font-bold text-white">게시글 삭제</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                정말로 이 게시글을 삭제하시겠습니까?<br />
                                삭제된 게시글은 복구할 수 없습니다.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteModalOpen(false)} disabled={deleteSaving} className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors">
                                    취소
                                </button>
                                <button onClick={executeDelete} disabled={deleteSaving} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-sm font-medium transition-colors">
                                    {deleteSaving ? "삭제중..." : "삭제하기"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Avatar({ src, alt }: { src?: string | null; alt: string }) {
    if (!src) {
        return (
            <div className="w-5 h-5 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center text-[10px] text-gray-400">
                <Icons.Lock />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="w-5 h-5 rounded-full object-cover border border-white/10"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
        />
    );
}