"use client";
import { createContext, useContext } from "react";

/** Where pop-ups render. Inside the phone preview it is the scaled screen, so menus and dialogs stay on the phone. */
export const PortalRoot = createContext<HTMLElement | null>(null);
export const usePortalRoot = () => useContext(PortalRoot) ?? undefined;
