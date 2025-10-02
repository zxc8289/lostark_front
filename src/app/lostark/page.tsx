// "use client";

// import { useState } from "react";

// export default function LostArkPage() {
//     const [name, setName] = useState("");
//     const [result, setResult] = useState<any>(null);
//     const [error, setError] = useState<string | null>(null);
//     const [loading, setLoading] = useState(false);

//     const onSearch = async () => {
//         setLoading(true);
//         setError(null);
//         setResult(null);
//         try {
//             const res = await fetch(`/api/lostark/character/${encodeURIComponent(name)}`);
//             const data = await res.json();
//             if (!res.ok) throw new Error(data?.error || "불러오기 실패");
//             setResult(data);
//         } catch (e: any) {
//             setError(e.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     async function getLatestNotice() {
//         const res = await fetch("/api/notice", { cache: "no-store" });
//         if (!res.ok) throw new Error("Failed");
//         return res.json() as Promise<{ latest: { title: string; link: string; date?: string; type?: string } | null }>;
//     }


//     return (
//         <div className="p-6 max-w-xl space-y-4 text-white">
//             <div>
//                 <h1 className="text-xl font-semibold ">로스트아크 캐릭터 조회</h1>
//                 <div className="flex gap-2">
//                     <input
//                         className="border rounded px-3 py-2 flex-1"
//                         placeholder="캐릭터 닉네임"
//                         value={name}
//                         onChange={(e) => setName(e.target.value)}
//                         onKeyDown={(e) => e.key === "Enter" && onSearch()}
//                     />
//                     <button
//                         className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
//                         onClick={onSearch}
//                         disabled={!name || loading}
//                     >
//                         {loading ? "불러오는중..." : "조회"}
//                     </button>
//                 </div>

//                 {error && <div className="text-red-600 text-sm">에러: {error}</div>}

//                 {result && (
//                     <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto">
//                         {JSON.stringify(result, null, 2)}
//                     </pre>
//                 )}
//             </div>

//         </div>
//     );
// }
