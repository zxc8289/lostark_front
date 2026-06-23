"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type AlertItem = {
  id: number;
  message: string;
};

export default function AppAlertModal() {
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const nextIdRef = useRef(1);

  const closeCurrent = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message?: unknown) => {
      const text =
        message === undefined || message === null ? "" : String(message);

      setQueue((current) => [
        ...current,
        {
          id: nextIdRef.current++,
          message: text,
        },
      ]);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        closeCurrent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCurrent, queue.length]);

  const current = queue[0];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-alert-title"
      aria-describedby="app-alert-message"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="알림 닫기"
        onClick={closeCurrent}
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#252832] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h2 id="app-alert-title" className="text-base font-bold text-white">
              알림
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCurrent}
            className="rounded-full p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-6">
          <p
            id="app-alert-message"
            className="whitespace-pre-wrap break-keep text-center text-sm leading-6 text-gray-200"
          >
            {current.message}
          </p>

          <button
            type="button"
            onClick={closeCurrent}
            className="mt-6 w-full rounded-xl bg-[#5B69FF] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4a57e0]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
