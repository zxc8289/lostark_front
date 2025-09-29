export default function ActionBar({ coreCount, invCount, onRun }: { coreCount: number; invCount: number; onRun: () => void }) {
    return (
        <footer className="bottom-0 left-0 right-0 bg-[#2d333b] backdrop-blur border border-[#444c56] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="text-sm ">선택 코어 <b className="ml-1 ">{coreCount}</b></div>
            <div className="text-sm ">보유 젬 <b className="ml-1 ">{invCount}</b></div>
            <div className="grow" />
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold" onClick={onRun}>최적화</button>
        </footer>
    )
} 