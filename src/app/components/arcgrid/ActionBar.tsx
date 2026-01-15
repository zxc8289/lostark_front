export default function ActionBar({ coreCount, invCount, onRun }: { coreCount: number; invCount: number; onRun: () => void }) {
    return (
        <footer className="bottom-0 left-0 right-0 bg-[#2d333b] backdrop-blur border border-[#444c56] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="text-sm ">선택 코어 <b className="ml-1 ">{coreCount}</b></div>
            <div className="text-sm ">보유 젬 <b className="ml-1 ">{invCount}</b></div>
            <div className="grow" />
            <button className="px-4 py-2 rounded-xl bg-[#5B69FF] text-white hover:bg-[#4A57E6] hover:shadow-lg hover:shadow-[#5B69FF]/25 hover:-translate-y-0.5 transition-all duration-200 text-sm font-semibold gap-2" onClick={onRun}>최적화</button>
        </footer>
    )
} 