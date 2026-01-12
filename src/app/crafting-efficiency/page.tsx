"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type MarketItem = {
    Id?: number | string;
    Name?: string;
    Icon?: string;
    Grade?: string;
    BundleCount?: number;

    RecentPrice?: number;       // 최근가
    CurrentMinPrice?: number;   // 현재 최저가
    YDayAvgPrice?: number;      // 전일 평균가
};

function n(v: any, fallback = 0) {
    const num = Number(v);
    return Number.isFinite(num) ? num : fallback;
}

function formatNumber(v: any) {
    const num = Number(v);
    if (!Number.isFinite(num)) return "—";
    return Math.round(num).toLocaleString();
}

function formatNumberFixed(v: any, digits = 2) {
    const num = Number(v);
    if (!Number.isFinite(num)) return "—";
    return num.toFixed(digits);
}

function pickListFromData(data: any): MarketItem[] {
    const list =
        data?.Items ??
        data?.items ??
        data?.AuctionItems ??
        data?.auctionItems ??
        [];
    return Array.isArray(list) ? list : [];
}

// =====================
// 오레하 제작 효율 계산기 (RiceCalculator 구조 그대로)
// =====================
const OREHA_NAME = "최상급 오레하 융화 재료";
const CALC_FEE = 300;

// (소모량 그대로)
const QTY: Record<string, number> = {
    "오레하 유물": 52,
    "희귀한 유물": 51,
    "고대 유물": 107,
    "오레하 두툼한 생고기": 52,
    "질긴 가죽": 69,
    "두툼한 생고기": 142,
    "오레하 태양 잉어": 52,
    "자연산 진주": 69,
    "생선": 142,
};

const CALC_GROUPS: Array<{ title: string; names: string[] }> = [
    { title: "제작 공방(수렵)", names: ["오레하 두툼한 생고기", "질긴 가죽", "두툼한 생고기"] },
    { title: "제작 공방(낚시)", names: ["오레하 태양 잉어", "자연산 진주", "생선"] },
    { title: "제작 공방(고고학)", names: ["오레하 유물", "희귀한 유물", "고대 유물"] },
];

const CALC_PAGES = [1, 2, 3];

function perOneGold(it: MarketItem) {
    const recent = n(it?.RecentPrice);
    const bundle = Math.max(1, n(it?.BundleCount, 1));
    return recent / bundle;
}

function calcTotalCost(names: string[], byName: Record<string, MarketItem | null>) {
    let total = 0;
    for (const nm of names) {
        const it = byName[nm];
        if (!it) return null;
        total += perOneGold(it) * (QTY[nm] ?? 0);
    }
    total += CALC_FEE;
    return total;
}

// =====================
// 페이지 컴포넌트
// =====================
export default function CraftingEfficiencyPage() {
    // ---- 기존 시세 조회 UI 상태 ----
    const [categoryCode, setCategoryCode] = useState<string>("90000");
    const [pageNo, setPageNo] = useState<string>("1");
    const [itemName, setItemName] = useState<string>("");

    const [sort, setSort] = useState<string>("RECENT_PRICE");
    const [sortCondition, setSortCondition] = useState<string>("DESC");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [itemsJson, setItemsJson] = useState<any>(null);
    const [itemsUpdatedAt, setItemsUpdatedAt] = useState<string | null>(null);

    // cache_miss 무한 재시도 방지용
    const retryRef = useRef<number | null>(null);

    const queryString = useMemo(() => {
        const sp = new URLSearchParams();
        sp.set("watch", "0"); // ✅ 프론트는 읽기 전용
        sp.set("categoryCode", categoryCode || "90000");
        sp.set("pageNo", pageNo || "1");
        if (itemName.trim()) sp.set("itemName", itemName.trim());
        sp.set("sort", sort || "RECENT_PRICE");
        sp.set("sortCondition", sortCondition || "DESC");
        return sp.toString();
    }, [categoryCode, pageNo, itemName, sort, sortCondition]);

    async function fetchItems() {
        if (retryRef.current) {
            window.clearTimeout(retryRef.current);
            retryRef.current = null;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`/api/lostark/lostark-market?${queryString}`, { cache: "no-store" });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                // ✅ cache_miss는 “안내만” (무한 재시도 X)
                if (json?.error === "cache_miss") {
                    setItemsJson(null);
                    setItemsUpdatedAt(null);
                    setErrorMsg(json?.hint ?? "캐시가 없습니다. (크론 저장 조건만 조회 가능)");
                    return;
                }
                throw new Error(json?.error ?? `fetch failed: ${res.status}`);
            }

            setItemsJson(json?.data ?? null);
            setItemsUpdatedAt(json?.updatedAt ? String(json.updatedAt) : null);
        } catch (e: any) {
            setItemsJson(null);
            setItemsUpdatedAt(null);
            setErrorMsg(String(e?.message ?? e));
        } finally {
            setLoading(false);
        }
    }

    // ---- 오레하 계산기 상태 ----
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [calcUpdatedAt, setCalcUpdatedAt] = useState<string | null>(null);
    const [orehaItem, setOrehaItem] = useState<MarketItem | null>(null);
    const [calcByName, setCalcByName] = useState<Record<string, MarketItem | null>>({});

    async function fetchCached(params: Record<string, string>) {
        const sp = new URLSearchParams(params);
        sp.set("watch", "0"); // ✅ 읽기 전용
        const res = await fetch(`/api/lostark/lostark-market?${sp.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, json };
    }

    async function fetchOrehaCalculator() {
        setCalcLoading(true);
        setCalcError(null);

        try {
            // 1) 생활 재료 전체(90000) page 1~3 합치기
            const merged: MarketItem[] = [];
            let newestAt: string | null = null;

            for (const p of CALC_PAGES) {
                const r = await fetchCached({
                    categoryCode: "90000",
                    pageNo: String(p),
                    sort: "RECENT_PRICE",
                    sortCondition: "DESC",
                });

                if (!r.ok) {
                    if (r.json?.error === "cache_miss") {
                        throw new Error(r.json?.hint ?? "계산기용(90000) 캐시가 없습니다. (크론 seed 필요)");
                    }
                    throw new Error(r.json?.error ?? `calc fetch failed (${r.status})`);
                }

                if (!newestAt && r.json?.updatedAt) newestAt = String(r.json.updatedAt);
                merged.push(...pickListFromData(r.json?.data));
            }

            // 이름별 map 초기화
            const map: Record<string, MarketItem | null> = {};
            for (const g of CALC_GROUPS) for (const nm of g.names) map[nm] = null;

            // merged에서 필요한 애들 채우기(정확히 이름 일치)
            for (const it of merged) {
                const nm = String(it?.Name ?? "");
                if (nm in map && !map[nm]) map[nm] = it;
            }

            // 2) 최상급 오레하 융화 재료 (50000 + itemName)
            const oreha = await fetchCached({
                categoryCode: "50000",
                pageNo: "1",
                itemName: OREHA_NAME,
                sort: "RECENT_PRICE",
                sortCondition: "DESC",
            });

            if (!oreha.ok) {
                if (oreha.json?.error === "cache_miss") {
                    throw new Error(oreha.json?.hint ?? "오레하(50000) 캐시가 없습니다. (크론 seed 필요)");
                }
                throw new Error(oreha.json?.error ?? `oreha fetch failed (${oreha.status})`);
            }

            const orehaList = pickListFromData(oreha.json?.data);
            const orehaOne =
                orehaList.find((x) => String(x?.Name ?? "") === OREHA_NAME) ??
                orehaList[0] ??
                null;

            setCalcByName(map);
            setOrehaItem(orehaOne);
            setCalcUpdatedAt(newestAt ?? (oreha.json?.updatedAt ? String(oreha.json.updatedAt) : null));
        } catch (e: any) {
            setCalcByName({});
            setOrehaItem(null);
            setCalcUpdatedAt(null);
            setCalcError(String(e?.message ?? e));
        } finally {
            setCalcLoading(false);
        }
    }

    useEffect(() => {
        // 페이지 들어오면 둘 다 1번씩 로드
        fetchItems();
        fetchOrehaCalculator();

        return () => {
            if (retryRef.current) window.clearTimeout(retryRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 테이블용 리스트
    const tableItems = useMemo(() => {
        if (!itemsJson) return [];
        return pickListFromData(itemsJson);
    }, [itemsJson]);

    // 계산기 파생값
    const oreha15 = orehaItem?.RecentPrice != null ? n(orehaItem.RecentPrice) * 15 : null;

    return (
        <div className="w-full min-h-screen bg-[#121212] text-gray-100 py-10 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-gray-800 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">제작 효율 / 시세 조회</h1>
                        <p className="text-sm text-gray-500">
                            프론트는 DB 캐시만 읽고 계산만 합니다 (OpenAPI 직접 호출 X)
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            fetchItems();
                            fetchOrehaCalculator();
                        }}
                        className="px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700"
                    >
                        전체 새로고침
                    </button>
                </div>

                {/* ===================== */}
                {/* 오레하 제작 효율 계산기 */}
                {/* ===================== */}
                <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <div className="text-lg font-semibold">오레하 제작 효율 계산기</div>
                            <div className="text-xs text-gray-500">DB 캐시만 조회해서 계산</div>
                            <div className="text-xs text-gray-500">
                                갱신: {calcUpdatedAt ? new Date(calcUpdatedAt).toLocaleString() : "—"}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchOrehaCalculator}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg text-sm border border-gray-600"
                            >
                                계산기 새로고침
                            </button>

                            <div className="flex items-center gap-2 bg-gray-900/40 border border-gray-800 rounded-lg px-3 py-2">
                                {orehaItem?.Icon ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={orehaItem.Icon} alt="" className="w-8 h-8" />
                                ) : (
                                    <div className="w-8 h-8 rounded bg-gray-800" />
                                )}
                                <div className="text-sm">
                                    <div className="text-gray-400">{OREHA_NAME}</div>
                                    <div className="font-semibold">
                                        {orehaItem?.RecentPrice != null ? `${formatNumber(orehaItem.RecentPrice)} G` : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(calcLoading || calcError) && (
                        <div
                            className={`mt-4 p-3 rounded-lg border text-sm ${calcError
                                ? "bg-red-900/20 border-red-800 text-red-200"
                                : "bg-blue-900/20 border-blue-800 text-blue-200"
                                }`}
                        >
                            {calcLoading ? "계산기 데이터를 불러오는 중..." : `계산기 오류: ${calcError}`}
                        </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {CALC_GROUPS.map((g) => {
                            const totalCost = calcTotalCost(g.names, calcByName);
                            const profit = totalCost != null && oreha15 != null ? oreha15 - totalCost : null;

                            return (
                                <div key={g.title} className="bg-[#121212] border border-gray-700 rounded-xl overflow-hidden">
                                    <div className="px-5 py-4 bg-gray-800/40 border-b border-gray-700 font-semibold text-center">
                                        {g.title}
                                    </div>

                                    <div className="divide-y divide-gray-800">
                                        {g.names.map((nm) => {
                                            const it = calcByName?.[nm] ?? null;
                                            const each = it ? perOneGold(it) : null;

                                            return (
                                                <div key={nm} className="px-5 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {it?.Icon ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={it.Icon} alt="" className="w-10 h-10" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded bg-gray-800" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="truncate">{nm}</div>
                                                            <div className="text-xs text-gray-500">
                                                                소모 {QTY[nm] ?? 0}개 · 묶음 {it?.BundleCount ?? "—"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <div className="font-mono">
                                                            {it?.RecentPrice != null ? `${formatNumber(it.RecentPrice)} G` : "—"}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            개당 {each != null ? `${formatNumberFixed(each, 2)} G` : "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="px-5 py-4 border-t border-gray-700 bg-gray-900/30 text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">제작 총 비용</span>
                                            <span className="font-mono">
                                                {totalCost != null ? `${formatNumberFixed(totalCost, 2)} G` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">오레하 15개 가격</span>
                                            <span className="font-mono">
                                                {oreha15 != null ? `${formatNumberFixed(oreha15, 2)} G` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">이윤</span>
                                            <span
                                                className={`font-mono font-semibold ${profit != null && profit >= 0 ? "text-green-300" : "text-red-300"
                                                    }`}
                                            >
                                                {profit != null ? `${formatNumberFixed(profit, 2)} G` : "—"}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 pt-2">※ 제작 수수료 {CALC_FEE}G 포함</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ===================== */}
                {/* 생활재료 시세 조회 영역 */}
                {/* ===================== */}
                <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <div className="text-lg font-semibold">시세 조회(캐시)</div>
                            <div className="text-xs text-gray-500">
                                갱신: {itemsUpdatedAt ? new Date(itemsUpdatedAt).toLocaleString() : "—"}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">category</span>
                                <input
                                    value={categoryCode}
                                    onChange={(e) => setCategoryCode(e.target.value)}
                                    className="w-24 px-2 py-2 rounded bg-[#121212] border border-gray-700 text-sm"
                                    placeholder="90000"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">page</span>
                                <input
                                    value={pageNo}
                                    onChange={(e) => setPageNo(e.target.value)}
                                    className="w-16 px-2 py-2 rounded bg-[#121212] border border-gray-700 text-sm"
                                    placeholder="1"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">itemName</span>
                                <input
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    className="w-56 px-2 py-2 rounded bg-[#121212] border border-gray-700 text-sm"
                                    placeholder="(비우면 전체)"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">sort</span>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    className="px-2 py-2 rounded bg-[#121212] border border-gray-700 text-sm"
                                >
                                    <option value="RECENT_PRICE">RECENT_PRICE(최근가)</option>
                                    <option value="CURRENT_MIN_PRICE">CURRENT_MIN_PRICE(최저가)</option>
                                    <option value="YDAY_AVG_PRICE">YDAY_AVG_PRICE(전일평균)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">order</span>
                                <select
                                    value={sortCondition}
                                    onChange={(e) => setSortCondition(e.target.value)}
                                    className="px-2 py-2 rounded bg-[#121212] border border-gray-700 text-sm"
                                >
                                    <option value="DESC">DESC(내림)</option>
                                    <option value="ASC">ASC(오름)</option>
                                </select>
                            </div>

                            <button
                                onClick={fetchItems}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm"
                            >
                                조회
                            </button>
                        </div>
                    </div>

                    {(loading || errorMsg) && (
                        <div
                            className={`mt-4 p-3 rounded-lg border text-sm ${errorMsg
                                ? "bg-red-900/20 border-red-800 text-red-200"
                                : "bg-blue-900/20 border-blue-800 text-blue-200"
                                }`}
                        >
                            {loading ? "데이터를 불러오는 중..." : `오류: ${errorMsg}`}
                        </div>
                    )}

                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm border border-gray-800">
                            <thead className="bg-gray-800/40">
                                <tr>
                                    <th className="px-3 py-2 text-left">아이템</th>
                                    <th className="px-3 py-2 text-right">최근가</th>
                                    <th className="px-3 py-2 text-right">최저가</th>
                                    <th className="px-3 py-2 text-right">전일평균</th>
                                    <th className="px-3 py-2 text-right">묶음</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tableItems.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                                            {itemsJson ? "데이터가 없습니다." : "조회 결과가 여기에 표시됩니다."}
                                        </td>
                                    </tr>
                                ) : (
                                    tableItems.map((it, idx) => (
                                        <tr key={`${it?.Id ?? it?.Name ?? idx}`} className="hover:bg-white/5">
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-3">
                                                    {it?.Icon ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={it.Icon} alt="" className="w-8 h-8" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-gray-800" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate">{it?.Name ?? "—"}</div>
                                                        <div className="text-xs text-gray-500">{it?.Grade ?? ""}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">{formatNumber(it?.RecentPrice)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatNumber(it?.CurrentMinPrice)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatNumber(it?.YDayAvgPrice)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{formatNumber(it?.BundleCount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                        ※ cache_miss(404)이 뜨면 그 조건은 DB에 아직 없습니다. (크론이 저장한 조건만 조회 가능)
                    </div>
                </div>
            </div>
        </div>
    );
}
