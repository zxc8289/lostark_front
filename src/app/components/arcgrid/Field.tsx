'use client';
import { ReactNode } from "react";
export default function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm">{label}</label>
            {children}
        </div>
    );
}
