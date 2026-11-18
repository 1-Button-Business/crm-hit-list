// Sign-in. Two setups share this code:
// - The 1BB site: Google only, and only emails on the member list get in.
// - A member's own site (OWNER_EMAIL is set): email and password, for that one email only.
//   Making the login also needs OWNER_SETUP_CODE, so nobody can claim the site before the owner does.
// A test-only door exists on the dev database (TEST_LOGIN=1) so flows can be checked without a real account.
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";

const owner = () => (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();

/** Same answer time whether the first letter or the last one is wrong. */
export function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Only the owner's email, and making the login needs the setup code. */
export function ownerProfile(params: Record<string, unknown>) {
  const email = String(params.email ?? "").trim().toLowerCase();
  if (!owner() || !sameText(email, owner())) throw new ConvexError("This CRM belongs to someone else. Only its owner can sign in.");
  if (params.flow === "signUp") {
    const code = (process.env.OWNER_SETUP_CODE ?? "").trim();
    if (!code || !sameText(String(params.setupCode ?? "").trim(), code)) throw new ConvexError("That setup code is not right. Ask Claude for the code it gave you.");
  }
  return { email };
}

const ownSite = owner() !== "";
const tests = process.env.TEST_LOGIN === "1" ? [Anonymous] : [];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: ownSite ? [Password({ profile: ownerProfile }), ...tests] : [Google, ...tests],
  callbacks: ownSite
    ? {
        // One owner, one user row. A fresh login after a password reset finds the same row, so the list stays.
        async createOrUpdateUser(anyCtx, { existingUserId, profile }) {
          if (existingUserId) return existingUserId;
          const { db } = anyCtx as unknown as MutationCtx;
          const email = typeof profile.email === "string" ? profile.email : "";
          const found = email ? await db.query("users").withIndex("email", (q) => q.eq("email", email)).first() : null;
          return found ? found._id : await db.insert("users", email ? { email } : { isAnonymous: true });
        },
      }
    : undefined,
});
