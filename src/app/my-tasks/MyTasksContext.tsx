"use client";

import { createContext, useContext } from "react";

export const MyTasksContext = createContext<any>(null);

export const useMyTasksCtx = () => {
    const context = useContext(MyTasksContext);
    if (!context) {
        throw new Error("useMyTasksCtx must be used within a MyTasksContext.Provider");
    }
    return context;
};