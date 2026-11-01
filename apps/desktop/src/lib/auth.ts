import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { emailSchema, otpSchema, passwordSchema } from "./validation";

export class AuthFlowError extends Error {
  constructor(
    message: string,
    public code: string = "unknown",
  ) {
    super(message);
  }
}

export function friendlyAuthError(error: AuthError | Error | null | undefined): AuthFlowError {
  const code = (error as AuthError | undefined)?.code ?? "unknown";
  const msg = error?.message ?? "";
  const map: Record<string, string> = {
    invalid_credentials: "That email and password don't match. Please try again.",
    email_not_confirmed: "Please verify your email address first.",
    user_already_exists: "An account with this email already exists. Try Restore My Buddy instead.",
    email_exists: "An account with this email already exists. Try Restore My Buddy instead.",
    weak_password: "That password is too weak. Use 8+ characters with upper and lowercase letters and a number.",
    otp_expired: "That code has expired or is incorrect. Request a new one and try again.",
    over_email_send_rate_limit: "Too many emails sent. Please wait a minute and try again.",
    over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
    same_password: "Your new password must be different from your old one.",
    reauthentication_needed: "Please confirm your password again.",
  };
  if (map[code]) return new AuthFlowError(map[code], code);
  if (/fetch|network|Failed to fetch/i.test(msg)) {
    return new AuthFlowError("Can't reach AI Buddy's servers. Check your internet connection.", "network");
  }
  return new AuthFlowError(msg || "Something went wrong. Please try again.", code);
}

function parse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, v: unknown): T {
  const r = schema.safeParse(v);
  if (!r.success) throw new AuthFlowError(r.error!.issues[0].message, "validation");
  return r.data as T;
}

export function createAuthService(client: SupabaseClient) {
  return {
    async signUp(email: string, password: string) {
      const e = parse<string>(emailSchema, email);
      const p = parse<string>(passwordSchema, password);
      const { data, error } = await client.auth.signUp({ email: e, password: p });
      if (error) throw friendlyAuthError(error);
      // Supabase hides existing accounts by returning a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        throw new AuthFlowError("An account with this email already exists. Try Restore My Buddy instead.", "user_already_exists");
      }
      return { needsVerification: !data.session };
    },

    async verifySignupCode(email: string, code: string) {
      const { error } = await client.auth.verifyOtp({
        email: parse<string>(emailSchema, email),
        token: parse<string>(otpSchema, code),
        type: "signup",
      });
      if (error) throw friendlyAuthError(error);
    },

    async resendSignupCode(email: string) {
      const { error } = await client.auth.resend({ type: "signup", email: parse<string>(emailSchema, email) });
      if (error) throw friendlyAuthError(error);
    },

    async signIn(email: string, password: string) {
      const e = parse<string>(emailSchema, email);
      if (!password) throw new AuthFlowError("Please enter your password.", "validation");
      const { error } = await client.auth.signInWithPassword({ email: e, password });
      if (error) throw friendlyAuthError(error);
    },

    async requestPasswordReset(email: string) {
      const { error } = await client.auth.resetPasswordForEmail(parse<string>(emailSchema, email));
      if (error) throw friendlyAuthError(error);
    },

    async resetPasswordWithCode(email: string, code: string, newPassword: string) {
      const p = parse<string>(passwordSchema, newPassword);
      const { error } = await client.auth.verifyOtp({
        email: parse<string>(emailSchema, email),
        token: parse<string>(otpSchema, code),
        type: "recovery",
      });
      if (error) throw friendlyAuthError(error);
      const { error: updateError } = await client.auth.updateUser({ password: p });
      if (updateError) throw friendlyAuthError(updateError);
    },

    /** Re-checks the current password before sensitive actions. */
    async confirmPassword(password: string) {
      const { data } = await client.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new AuthFlowError("You're signed out. Please sign in again.", "no_session");
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw friendlyAuthError(error);
    },

    async requestReauthenticationCode() {
      const { error } = await client.auth.reauthenticate();
      if (error) throw friendlyAuthError(error);
    },

    async changePassword(newPassword: string, nonce?: string) {
      const p = parse<string>(passwordSchema, newPassword);
      const { error } = await client.auth.updateUser({ password: p, nonce });
      if (error) throw friendlyAuthError(error);
    },

    async deleteAccount() {
      const { error } = await client.rpc("delete_my_account");
      if (error) throw new AuthFlowError("Couldn't delete your account. Please try again.", error.code);
      await client.auth.signOut({ scope: "local" });
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw friendlyAuthError(error);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
