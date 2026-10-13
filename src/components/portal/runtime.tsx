"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/content/site";
import { portalCopy } from "@/content/portal";
import { authRequest } from "./request";

export type PortalRuntime = {
  request: typeof authRequest;
  get: (path: string, signal?: AbortSignal) => Promise<Response>;
  authPath: (locale: Locale, screen: string) => string;
  securityPath: (locale: Locale) => string;
  demo?: boolean;
  sampleInputs?: {
    name: string;
    email: string;
    password: string;
    newPassword: string;
    code: string;
  };
  messages?: Partial<typeof portalCopy.en.messages>;
};
const live: PortalRuntime = {
  request: authRequest,
  get: (path, signal) => fetch(path, { cache: "no-store", signal }),
  authPath: (locale, screen) => `/${locale}/auth/${screen}`,
  securityPath: (locale) => `/${locale}/portal/security`,
};
export const PortalRuntimeContext = createContext<PortalRuntime | null>(null);
export function usePortalRuntime() {
  return useContext(PortalRuntimeContext) ?? live;
}
