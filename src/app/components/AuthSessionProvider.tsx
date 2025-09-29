// src/app/components/AuthSessionProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import React from "react"; // ✨ React import 추가

// ✨ props에 타입 지정
export default function AuthSessionProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}