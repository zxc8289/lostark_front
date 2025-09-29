'use client';
export default function Step({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div>
            <div className="font-bold mb-1">{title}</div>
            <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
    );
}
