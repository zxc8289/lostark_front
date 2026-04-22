"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type NoticeCategory = "New" | "Fix" | "Update" | "공지";

type Notice = {
    id: string;
    title: string;
    content: string;
    category: NoticeCategory;
    createdAt: string | null;
    updatedAt: string | null;
};

// --- Icons ---
const Icons = {
    Megaphone: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    Pencil: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
    Exclamation: () => <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    ChevronLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
    ArrowLeft: () => <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    ShieldCheck: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
};

// --- 유틸리티 함수 ---
function fmtDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function categoryBadgeClass(category: NoticeCategory) {
    if (category === "New") return "bg-red-900/30 border-red-700 text-red-400";
    if (category === "Fix") return "bg-green-900/30 border-green-700 text-green-400";
    if (category === "Update") return "bg-blue-900/30 border-blue-700 text-blue-400";
    return "bg-purple-900/30 border-purple-700 text-purple-400"; // 공지
}

// --- 스켈레톤 UI 컴포넌트 ---
const CardSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#16181D] border border-white/5 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex justify-between"><div className="w-12 h-5 bg-gray-800 rounded" /><div className="w-16 h-4 bg-gray-800 rounded" /></div>
                <div className="w-3/4 h-5 bg-gray-800 rounded mt-2" />
                <div className="w-full h-10 bg-gray-800 rounded mt-1" />
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
    </div>
);

// --- 메인 페이지 본문 ---
function NoticePageContent() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<NoticeCategory>("공지");
    const [currentPage, setCurrentPage] = useState(1);
    const POSTS_PER_PAGE = 9;

    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [openId, setOpenId] = useState<string | null>(null);
    const [openNotice, setOpenNotice] = useState<Notice | null>(null);
    const [openLoading, setOpenLoading] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editCategory, setEditCategory] = useState<NoticeCategory>("공지");
    const [editSaving, setEditSaving] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const [adminSecret, setAdminSecret] = useState("");
    const isAdmin = adminSecret.trim().length > 0;

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
            const res = await fetch("/api/notice", { cache: "no-store" });
            const json = await res.json();
            if (json.ok) setNotices(json.notices as Notice[]);
        } catch (e) { console.error("목록 불러오기 실패", e); }
        finally { setLoading(false); }
    }

    useEffect(() => { refresh(); }, []);

    useEffect(() => {
        const queryPostId = searchParams.get("id");
        if (queryPostId && queryPostId !== openId) openDetail(queryPostId);
    }, [searchParams]);

    async function submitPost() {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/notice", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-admin-secret": adminSecret
                },
                body: JSON.stringify({ title, content, category }),
            });
            const json = await res.json();
            if (json.ok) {
                setTitle(""); setContent(""); setCategory("공지");
                await refresh();
            }
        } catch (e) { alert("등록 실패"); }
        finally { setSaving(false); }
    }

    async function openDetail(id: string) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setOpenId(id);
        setOpenLoading(true);
        try {
            const res = await fetch(`/api/notice/${id}`, { cache: "no-store" });
            const json = await res.json();
            if (json.ok) {
                setOpenNotice(json.notice);
                setEditTitle(json.notice.title);
                setEditContent(json.notice.content);
                setEditCategory(json.notice.category);
                router.refresh();
            }
        } catch (e) { console.error("상세 불러오기 실패", e); }
        finally { setOpenLoading(false); }
    }

    function closeDetail() {
        setOpenId(null); setOpenNotice(null); setEditMode(false);
        router.replace("/notice");
    }

    async function saveEdit() {
        if (!openId || !editTitle.trim() || !editContent.trim()) return;
        setEditSaving(true);
        try {
            await fetch(`/api/notice/${openId}`, {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    "x-admin-secret": adminSecret
                },
                body: JSON.stringify({ title: editTitle, content: editContent, category: editCategory }),
            });
            setEditMode(false); await openDetail(openId); await refresh();
        } finally { setEditSaving(false); }
    }

    async function executeDelete() {
        if (!openId) return;
        setDeleteSaving(true);
        try {
            await fetch(`/api/notice/${openId}`, {
                method: "DELETE",
                headers: { "x-admin-secret": adminSecret },
            });
            setDeleteModalOpen(false); closeDetail(); await refresh();
        } finally { setDeleteSaving(false); }
    }

    const totalPages = Math.ceil(notices.length / POSTS_PER_PAGE);
    const currentPosts = notices.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

    return (
        <div className="w-full text-white py-8 sm:py-12 min-h-screen bg-transparent">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-0">
                {!openId ? (
                    <div className="animate-in fade-in duration-300 space-y-8">
                        <div className="relative pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                    <Icons.Megaphone /> <span>로아체크 소식</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">공지사항 및 업데이트</h1>
                                <p className="text-sm text-gray-400 max-w-lg leading-relaxed">로아체크의 최신 패치 노트와 공지사항을 확인하세요.</p>
                            </div>

                            {/* 관리자 키 입력 영역 */}
                            <div className="flex items-center gap-2 bg-[#16181D] border border-white/5 px-3 py-2 rounded-lg">
                                <div className="text-gray-400"><Icons.ShieldCheck /></div>
                                <input
                                    type="password"
                                    value={adminSecret}
                                    onChange={(e) => setAdminSecret(e.target.value)}
                                    className="bg-transparent border-none text-gray-400 text-xs focus:ring-0 focus:outline-none w-24 focus:w-36 transition-all"
                                    placeholder="Admin Key"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* 관리자 전용 글쓰기 폼 */}
                        {isAdmin && (
                            <div className="bg-[#16181D] border border-[#5B69FF]/30 shadow-[0_0_15px_rgba(91,105,255,0.1)] rounded-xl p-5 mb-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-[#5B69FF] flex items-center gap-2"><Icons.Pencil /> 공지사항 등록 (관리자)</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                                            className="bg-[#0E1015] border border-white/10 text-sm text-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-[#5B69FF]"
                                        >
                                            <option value="공지">공지</option>
                                            <option value="Update">Update</option>
                                            <option value="Fix">Fix</option>
                                            <option value="New">New</option>
                                        </select>
                                    </div>
                                    <input className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none" placeholder="제목을 입력해주세요." value={title} onChange={(e) => setTitle(e.target.value)} />
                                    <textarea className="w-full bg-[#0E1015] border border-white/10 text-white rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#5B69FF] focus:outline-none resize-none h-32" placeholder="공지 내용을 입력해주세요..." value={content} onChange={(e) => setContent(e.target.value)} />
                                    <div className="flex justify-end"><button onClick={submitPost} disabled={saving || !title.trim() || !content.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium">{saving ? "등록중..." : "등록하기"}</button></div>
                                </div>
                            </div>
                        )}

                        {/* 목록 그리드 */}
                        <div>
                            {loading ? (
                                <CardSkeleton />
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {currentPosts.map((post) => (
                                            <button key={post.id} onClick={() => openDetail(post.id)} className="text-left bg-[#16181D] border border-white/5 rounded-xl p-5 hover:border-gray-600 transition-colors flex flex-col gap-3 group">
                                                <div className="flex justify-between items-start w-full mb-1">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${categoryBadgeClass(post.category)}`}>{post.category}</span>
                                                    <span className="text-xs text-gray-500">{fmtDate(post.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white mb-1.5 line-clamp-1 group-hover:text-blue-400 transition-colors">{post.title}</h3>
                                                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{post.content}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

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
                        {/* 목록으로 돌아가기 (지원 페이지와 동일한 사이즈 및 여백) */}
                        <button onClick={closeDetail} className="text-[#5B69FF] hover:text-blue-400 flex items-center text-sm font-medium mb-8 transition-colors">
                            <Icons.ArrowLeft /> 목록으로 돌아가기
                        </button>

                        {openLoading || !openNotice ? <DetailSkeleton /> : (
                            <div className="mb-10">
                                {editMode ? (
                                    <div className="space-y-4 mb-6 animate-in fade-in duration-200">
                                        <div className="flex gap-4">
                                            <select
                                                value={editCategory}
                                                onChange={(e) => setEditCategory(e.target.value as NoticeCategory)}
                                                className="bg-[#16181D] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#5B69FF]"
                                            >
                                                <option value="공지">공지</option>
                                                <option value="Update">Update</option>
                                                <option value="Fix">Fix</option>
                                                <option value="New">New</option>
                                            </select>
                                            <input
                                                className="flex-1 w-full bg-[#16181D] border border-gray-700 text-white rounded-xl px-4 py-3 text-2xl font-bold transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] placeholder-gray-600"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="제목을 입력하세요"
                                            />
                                        </div>
                                        <textarea
                                            className="w-full bg-[#16181D] border border-gray-700 text-gray-200 rounded-xl px-4 py-3 h-60 transition-all focus:outline-none focus:ring-1 focus:ring-[#5B69FF] focus:border-[#5B69FF] placeholder-gray-600 resize-none leading-relaxed"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            placeholder="내용을 입력하세요"
                                            spellCheck={false}
                                        />
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => setEditMode(false)} className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors">취소</button>
                                            <button onClick={saveEdit} disabled={editSaving} className="px-6 py-2 bg-[#5B69FF] hover:bg-[#4752C4] disabled:bg-gray-800 disabled:text-gray-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20">
                                                {editSaving ? "저장 중..." : "수정 완료"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* 제목 */}
                                        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-6 leading-tight break-keep">
                                            {openNotice.title}
                                        </h1>

                                        {/* 작성자, 날짜, 뱃지 & 수정/삭제 버튼 */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800 text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 font-medium text-gray-300">
                                                    <div className="w-5 h-5 rounded-full bg-[#5B69FF] flex items-center justify-center text-white">
                                                        <Icons.ShieldCheck />
                                                    </div>
                                                    로아체크
                                                </div>
                                                <span className="text-gray-500">|</span>
                                                <span className="text-gray-500">{fmtDate(openNotice.createdAt)}</span>
                                                <span className={`px-2 py-0.5 rounded border text-xs ${categoryBadgeClass(openNotice.category)} ml-2`}>
                                                    {openNotice.category}
                                                </span>
                                            </div>

                                            {/* 수정, 삭제 버튼을 오른쪽으로 배치 */}
                                            {isAdmin && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditMode(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                                        <Icons.Pencil />
                                                    </button>
                                                    <button onClick={() => setDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* 본문 (문의 게시판과 동일한 여백/폰트 속성 적용) */}
                                        <div className="pt-8 text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {openNotice.content}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 삭제 확인 모달 */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1E2028] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit text-red-500"><Icons.Exclamation /></div>
                        <h3 className="text-lg font-bold text-white mb-2">공지사항 삭제</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">정말로 이 공지사항을 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.</p>
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

export default function NoticePage() {
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
            <NoticePageContent />
        </Suspense>
    );
}
