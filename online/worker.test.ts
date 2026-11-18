// The tour video must answer byte-range requests, or iPhones will not play it.
import { expect, test } from "vitest";
import { serveVideo } from "./worker";

const file = new Uint8Array(100).map((_, i) => i);
const env = { ASSETS: { fetch: async () => new Response(file) } };
const get = (range?: string) => serveVideo(new Request("https://x/tour.mp4", range ? { headers: { range } } : {}), env);

test("byte ranges", async () => {
  const whole = await get();
  expect(whole.status).toBe(200);
  expect(whole.headers.get("accept-ranges")).toBe("bytes");

  const first = await get("bytes=0-9");
  expect(first.status).toBe(206);
  expect(first.headers.get("content-range")).toBe("bytes 0-9/100");
  expect([...new Uint8Array(await first.arrayBuffer())]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  expect((await get("bytes=95-")).headers.get("content-range")).toBe("bytes 95-99/100");
  expect((await get("bytes=-5")).headers.get("content-range")).toBe("bytes 95-99/100");
  expect((await get("bytes=90-500")).headers.get("content-range")).toBe("bytes 90-99/100");
  expect((await get("bytes=200-300")).status).toBe(416);
});
