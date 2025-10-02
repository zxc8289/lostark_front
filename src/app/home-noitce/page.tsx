// HomeNotice.tsx (클라 컴포넌트)
"use client";
import { useEffect, useState } from "react";

export default function HomeNotice() {
    const [data, setData] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/lostark/notice", { cache: "no-store" });

                const ct = res.headers.get("content-type") || "";
                const raw = await res.text(); // 먼저 text로 읽음(뭐가 오든 안전)

                if (!ct.includes("application/json")) {
                    // HTML/텍스트가 오면 그대로 보여주고 종료 (콘솔에서 차단/오류 페이지 확인)
                    console.error("[lostark-notice] non-JSON response:", raw.slice(0, 500));
                    setErr("API returned non-JSON. See console for details.");
                    return;
                }

                const json = JSON.parse(raw);
                if (!res.ok) {
                    setErr(`API error: ${json?.error || res.status}`);
                    return;
                }
                setData(json);
            } catch (e: any) {
                console.error("[lostark-notice] fetch failed:", e);
                setErr(String(e?.message || e));
            }
        })();
    }, []);

    if (err) return <div className="text-red-400">ERR: {err}</div>;
    if (!data) return <div>불러오는 중…</div>;

    const latest = data.latest;
    return (
        <p className="text-gray-300">
            {latest ? latest.title : "데이터 없음"}
        </p>
    );
}
