import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

function requestUa(): string {
  try {
    return getRequest()?.headers.get("user-agent") ?? "";
  } catch {
    return "";
  }
}

/** Exchange an app-minted handshake token for a signed device pass. */
export const exchangeAppToken = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(8).max(512) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyHandshake, issuePass, isAppCapableUa } = await import(
      "@/lib/app-attest.server"
    );
    const ua = requestUa();
    // A laptop/desktop browser can never hold an app pass, even with a valid token.
    if (!isAppCapableUa(ua)) return { ok: false as const };
    if (!(await verifyHandshake(data.token))) return { ok: false as const };
    return { ok: true as const, pass: await issuePass(ua) };
  });

/** Re-validate a stored device pass (called on every app load). */
export const validateAppPass = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pass: z.string().min(8).max(512) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyPass } = await import("@/lib/app-attest.server");
    return { ok: await verifyPass(data.pass, requestUa()) };
  });
