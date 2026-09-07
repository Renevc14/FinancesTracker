"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "").trim();
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  if (!username || !password) {
    return { error: "Username and password required" };
  }

  const { totpIsConfigured, verifyTotp } = await import("@/lib/crypto/totp");
  if (totpIsConfigured() && !verifyTotp(totp)) {
    return { error: "Invalid 2FA code" };
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/dashboard",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Wrong username or password" };
    }
    // Next.js redirect throws; rethrow so navigation happens
    throw err;
  }
}
