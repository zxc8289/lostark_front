'use client';
export default function Stat({ title, value }: { title: string; value: string | number }) {
    return (
        <div className="border rounded-lg p-3">
            <div className="text-xs text-zinc-500">{title}</div>
            <div className="font-semibold">{value}</div>
        </div>
    );
}
