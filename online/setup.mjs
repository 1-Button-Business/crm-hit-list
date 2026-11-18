// Turns this copy into ONE owner's site. Run after the first `npx convex deploy`:
//   node setup.mjs you@yourbusiness.com https://your-site-address
// It sets the database settings (never shown on screen, never saved to a file)
// and prints a one-time setup code. The owner needs that code once, to make their login.
// Run it again with --new-code to get a fresh code (for example after `npx convex run --prod owner:resetLogin`).
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomInt } from "node:crypto";

const args = process.argv.slice(2);
const newCodeOnly = args.includes("--new-code");
const [email = "", site = ""] = args.filter((a) => !a.startsWith("--"));
const bail = (msg) => { console.error(msg); process.exit(1); };

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bail("Give the owner's email first. Example: node setup.mjs you@yourbusiness.com https://crm.yourbusiness.com");
if (!newCodeOnly && !/^https:\/\/[^\s/]+$/.test(site)) bail("Give the site address second, starting with https:// and with nothing after the name. Example: https://crm.yourbusiness.com");

// execFileSync passes each value straight to the program. No shell, so nothing in a value can run as a command.
const set = (name, value) => execFileSync("npx", ["convex", "env", "set", "--prod", "--", name, value], { stdio: ["ignore", "ignore", "inherit"] });

// Letters and numbers that cannot be mixed up when read aloud (no 0/O, 1/I/L).
const ABC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const code = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => ABC[randomInt(ABC.length)]).join("")).join("-");

if (!newCodeOnly) {
  // The keys that sign each sign-in. Same format Convex Auth's own setup writes.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().trimEnd().replace(/\n/g, " ");
  const jwk = publicKey.export({ format: "jwk" });
  set("JWT_PRIVATE_KEY", pem);
  set("JWKS", JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] }));
  set("SITE_URL", site);
}
set("OWNER_EMAIL", email.trim().toLowerCase());
set("OWNER_SETUP_CODE", code);

console.log(`
Done. Only ${email.trim().toLowerCase()} can sign in to this CRM.
Setup code (needed once, to make the login): ${code}
Open the site, press "First time here? Make your login", and type it in with a new password.`);
