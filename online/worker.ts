// Serves the site's files, and passes Claude's connector calls (/mcp/...) on to the Convex back end.
// Nothing else runs here: no data is read or kept by this Worker.
// The 1BB site's back end. A member's own site sets CONVEX_SITE in its Worker settings instead.
const CONVEX_SITE = "";
const VIDEO = "/tour.mp4";

type Env = { ASSETS: { fetch: (r: Request) => Promise<Response> }; CONVEX_SITE?: string };

/** Byte-range answers for the tour video. iPhones and Safari will not play a video without them. */
// ponytail: reads the whole file (about 9 MB) per request; move the video to R2 if it grows past ~50 MB.
export async function serveVideo(req: Request, env: Env): Promise<Response> {
  const res = await env.ASSETS.fetch(new Request(new URL(VIDEO, req.url)));
  const headers = new Headers({ "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" });
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (!res.ok || !m || (!m[1] && !m[2])) return new Response(res.body, { status: res.status, headers });
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    headers.set("content-range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("content-range", `bytes ${start}-${end}/${size}`);
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // No sign-in system here (the private link is the key), so sign-in discovery must say "not found",
    // not fall through to the home page, or Claude decides the connector needs OAuth.
    if (url.pathname.startsWith("/.well-known/")) return new Response("Not found", { status: 404 });
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const target = env.CONVEX_SITE || CONVEX_SITE;
      if (!target) return new Response("The Claude connection is not set up on this site yet.", { status: 503 });
      return fetch(new Request(target + url.pathname + url.search, req));
    }
    if (url.pathname === VIDEO) return serveVideo(req, env);
    return env.ASSETS.fetch(req);
  },
};
