"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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

    const { data: session, status } = useSession();
    const isLoggedIn = status === "authenticated";
    const myName = (session as any)?.user?.name || "비회원";

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);

    // 상세 모달 상태
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

    // 삭제 관련 상태
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);

    // 관리자
    const [adminSecret, setAdminSecret] = useState("");
    const [replyText, setReplyText] = useState("");
    const isAdmin = useMemo(() => adminSecret.trim().length > 0, [adminSecret]);

    useEffect(() => {
        if (openId || deleteModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [openId, deleteModalOpen]);

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

    return (
        <div className="w-full text-white py-8 sm:py-12">
            <div className="mx-auto max-w-7xl space-y-5">
                <div className="relative pb-3">
                    <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                                    />
                                </svg>
                                <span>고객 지원 및 피드백</span>
                            </div>

                            {/* 메인 타이틀 */}
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                문의 게시판
                            </h1>

                            {/* 설명 문구 */}
                            <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                                자유롭게 건의사항이나 문의를 남겨주세요.
                            </p>
                        </div>

                        <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setViewMode("card")}
                                className={`w-9 h-9 rounded-md transition-all flex items-center justify-center focus:outline-none ${viewMode === "card"
                                    ? "bg-gray-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                                title="카드형 보기"
                            >
                                <Icons.Grid />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`w-9 h-9 rounded-md transition-all flex items-center justify-center focus:outline-none ${viewMode === "list"
                                    ? "bg-gray-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                                title="리스트형 보기"
                            >
                                <Icons.List />
                            </button>
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
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${isAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAnonymous ? "translate-x-5" : ""}`} />
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <span>작성자 비공개</span>
                                </div>
                            </label>
                        </div>

                        <input
                            className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none placeholder-gray-600 transition-all hover:border-white/20"
                            placeholder="제목을 입력해주세요."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <textarea
                            className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] focus:outline-none placeholder-gray-600 resize-none h-32 transition-all hover:border-white/20"
                            placeholder="문의 내용을 입력해주세요..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={submitPost}
                                disabled={saving || !title.trim() || !content.trim()}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {saving ? "등록중..." : "등록하기"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 목록 */}
                <div className="pt-2">
                    {loading ? (
                        <div className="text-gray-500 text-sm py-8 text-center">불러오는 중...</div>
                    ) : (
                        <>
                            {viewMode === "card" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {posts.map((post) => (
                                        <button
                                            key={post.id}
                                            onClick={() => openDetail(post.id)}
                                            className="text-left bg-[#16181D] border border-white/5 rounded-xl p-5 hover:border-gray-600 transition-colors flex flex-col gap-3 group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(post.status)}`}>
                                                    {post.status}
                                                </span>
                                                <span className="text-xs text-gray-500">{fmtDate(post.createdAt)}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                                                    {post.title}
                                                </h3>
                                                <p className="text-sm text-gray-400 line-clamp-2">{post.content}</p>
                                            </div>
                                            <div className="mt-auto pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                                                {post.isAnonymous ? (
                                                    <>
                                                        <Icons.Lock /> <span>비공개 회원</span>
                                                    </>
                                                ) : post.isGuestPost ? (
                                                    <>
                                                        <Icons.Pencil /> <span>{post.author}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Avatar src={post.authorImage} alt={post.author} />
                                                        <span>{post.author}</span>
                                                    </>
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
                                        {posts.map((post) => (
                                            <div key={post.id} className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-800/30 transition-colors gap-2 sm:gap-0">
                                                <div className="flex sm:hidden justify-between text-xs text-gray-500 mb-1">
                                                    <span className={`px-1.5 rounded border ${statusBadgeClass(post.status)}`}>{post.status}</span>
                                                    <span>{fmtDate(post.createdAt)}</span>
                                                </div>
                                                <div className="hidden sm:block w-16 text-center">
                                                    <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(post.status)}`}>
                                                        {post.status}
                                                    </span>
                                                </div>
                                                <button onClick={() => openDetail(post.id)} className="flex-1 sm:px-4 min-w-0 text-left group">
                                                    <h3 className="text-sm sm:text-base font-medium text-gray-200 group-hover:text-blue-400 truncate">
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 truncate sm:hidden">{post.content}</p>
                                                </button>
                                                <div className="flex items-center justify-between sm:contents mt-2 sm:mt-0">
                                                    <div className="w-28 text-sm text-gray-400 sm:text-center flex items-center sm:justify-center gap-2">
                                                        {post.isAnonymous ? (
                                                            <>
                                                                <Icons.Lock /> <span>비공개 회원</span>
                                                            </>
                                                        ) : post.isGuestPost ? (
                                                            <>
                                                                <Icons.Pencil /> <span>{post.author}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Avatar src={post.authorImage} alt={post.author} />
                                                                <span>{post.author}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="hidden sm:block w-24 text-sm text-gray-500 text-center">
                                                        {fmtDate(post.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 상세 모달 */}
            {openId && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-[#16181D] border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] relative">
                        {/* 헤더 */}
                        <div className="flex items-start justify-between px-6 py-5 border-b border-white/10 shrink-0">
                            <div className="min-w-0 flex-1 mr-4">
                                {/* 헤더 로딩 스켈레톤 (로딩 중일 때 표시) */}
                                {openLoading ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="flex gap-2">
                                            <div className="w-12 h-5 bg-gray-700 rounded"></div>
                                            <div className="w-20 h-5 bg-gray-700 rounded"></div>
                                        </div>
                                        <div className="w-3/4 h-7 bg-gray-700 rounded"></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            {openPost?.status && (
                                                <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(openPost.status)}`}>
                                                    {openPost.status}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500">{fmtDate(openPost?.createdAt ?? null)}</span>
                                        </div>

                                        <h2 className="text-xl font-bold text-white leading-snug break-keep ">
                                            {openPost ? openPost.title : ""}
                                        </h2>

                                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                            {openPost?.isAnonymous ? <Icons.Anonymous /> : null}
                                            <span>
                                                작성자:{" "}
                                                <span className="text-gray-300">
                                                    {openPost?.isAnonymous ? "비공개 회원" : openPost?.author}
                                                </span>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {canEdit && !openLoading && (
                                    <>
                                        <button
                                            onClick={() => setEditMode((v) => !v)}
                                            className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                                            title="수정"
                                        >
                                            <Icons.Pencil />
                                        </button>
                                        <button
                                            onClick={() => setDeleteModalOpen(true)}
                                            disabled={deleteSaving}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-300 transition-colors disabled:opacity-50"
                                            title="삭제"
                                        >
                                            <Icons.Trash />
                                        </button>
                                    </>
                                )}

                                <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                                    <Icons.X />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">
                            {openLoading ? (
                                // ✅ [변경됨] 상세 본문 로딩: 더 자연스러운 스켈레톤 UI
                                <div className="animate-pulse space-y-8">
                                    {/* 질문 영역 스켈레톤 */}
                                    <div className="bg-[#1E2028] rounded-xl border border-gray-700/50 p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
                                            <div className="h-4 bg-gray-700 rounded w-20"></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-3 bg-gray-700 rounded w-full"></div>
                                            <div className="h-3 bg-gray-700 rounded w-11/12"></div>
                                            <div className="h-3 bg-gray-700 rounded w-4/5"></div>
                                        </div>
                                    </div>
                                    {/* 답변 영역 스켈레톤 */}
                                    <div className="space-y-4">
                                        <div className="h-4 bg-gray-700 rounded w-24"></div>
                                        <div className="space-y-3">
                                            <div className="h-20 bg-gray-800/50 rounded-xl border border-white/5"></div>
                                            <div className="h-16 bg-gray-800/50 rounded-xl border border-white/5"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* 문의 내용 / 수정 폼 */}
                                    <div className="bg-[#1E2028] rounded-xl border border-gray-700/50 p-5 mb-8 shadow-sm">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm select-none">
                                                <Icons.Question />
                                                <span>문의 내용</span>
                                            </div>

                                            {editMode && (
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={editAnonymous}
                                                            onChange={(e) => setEditAnonymous(e.target.checked)}
                                                        />
                                                        <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${editAnonymous ? "bg-blue-600" : "bg-gray-600"}`} />
                                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editAnonymous ? "translate-x-5" : ""}`} />
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                        {editAnonymous}
                                                        <span>작성자 비공개</span>
                                                    </div>
                                                </label>
                                            )}
                                        </div>

                                        {editMode ? (
                                            <div className="space-y-3">
                                                <input
                                                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-500"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                />
                                                <textarea
                                                    className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-500 resize-none h-32"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditMode(false);
                                                            if (openPost) {
                                                                setEditTitle(openPost.title);
                                                                setEditContent(openPost.content);
                                                                setEditAnonymous(!!openPost.isAnonymous);
                                                            }
                                                        }}
                                                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={editSaving || !editTitle.trim() || !editContent.trim()}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-sm"
                                                    >
                                                        {editSaving ? "저장중..." : "저장"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-200 whitespace-pre-wrap leading-relaxed pl-0.5 text-[15px]">
                                                {openPost?.content}
                                            </div>
                                        )}
                                    </div>

                                    {/* 답변 */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2 mb-4 text-gray-300 font-bold text-sm select-none">
                                            <Icons.Answer />
                                            <span>답변 내역</span>
                                            <span className="text-xs text-gray-500 font-normal ml-1">({openReplies.length})</span>
                                        </div>

                                        {openReplies.length === 0 ? (
                                            <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                                <p className="text-sm text-gray-500">아직 등록된 답변이 없습니다.</p>
                                                <p className="text-xs text-gray-600 mt-1">관리자가 확인 후 답변을 작성할 예정입니다</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {openReplies.map((r) => (
                                                    <div
                                                        key={r.id}
                                                        className={`rounded-xl border px-5 py-4 transition-all ${r.isStaff ? "border-blue-500/30 bg-blue-900/10" : "border-gray-700 bg-gray-800/50"
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center text-xs mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                {r.isStaff ? (
                                                                    <span className="flex items-center gap-1 text-blue-400 font-semibold bg-blue-400/10 px-1.5 py-0.5 rounded">
                                                                        <Icons.Shield /> 관리자
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300 font-medium ">{r.author}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-gray-500 ">{fmtDate(r.createdAt)}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed pl-0.5">{r.content}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 관리자 작성 */}
                                    <div className="mt-8 bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                                <Icons.Shield />
                                                <span>관리자 전용</span>
                                            </div>
                                            <input
                                                type="password"
                                                className="bg-black/40 border border-white/10 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-600 w-24 transition-all focus:w-40 text-right"
                                                placeholder="Admin Key"
                                                value={adminSecret}
                                                onChange={(e) => setAdminSecret(e.target.value)}
                                            />
                                        </div>

                                        {isAdmin && (
                                            <div className="p-4 bg-blue-500/5">
                                                <div className="mb-2 text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                    </span>
                                                    답변 작성 모드
                                                </div>
                                                <textarea
                                                    className="w-full bg-gray-900 border border-blue-500/20 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-600 resize-none h-24 text-sm"
                                                    placeholder="답변 내용을 입력하세요..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                />
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={submitReply}
                                                        disabled={!replyText.trim()}
                                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        답글 등록
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!canEdit && openPost?.isGuestPost && (
                                        <div className="mt-4 text-xs text-gray-500">
                                            이 글은 비회원 글입니다. 작성했던 브라우저가 아니라면 수정/삭제가 불가할 수 있어요.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ 삭제 확인 모달 (상세 모달보다 z-index 높음) */}
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
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    disabled={deleteSaving}
                                    className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={executeDelete}
                                    disabled={deleteSaving}
                                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-sm font-medium transition-colors"
                                >
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
            <div className="w-5 h-5 rounded-full bg-gray-700 border border-white/10" />
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