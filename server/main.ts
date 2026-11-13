// `npm start` runs this. It serves the screen and the data on your computer only.
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { createServer as createVite } from "vite";
import { handleApi } from "./api.ts";
import { Store, dataFile } from "./store.ts";

process.title = "my-crm";
const port = Number(process.env.PORT ?? 4747);
const store = new Store(dataFile());
const vite = await createVite({ server: { middlewareMode: true }, appType: "spa" });

const server = createServer(async (req, res) => {
  if (await handleApi(store, req, res)) return;
  vite.middlewares(req, res);
});

server.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE") console.error(`\nYour CRM is already running, or something else is using port ${port}.\nOpen http://localhost:${port} or start it on another port:  PORT=4748 npm start\n`);
  else console.error(e);
  process.exit(1);
});

// 127.0.0.1 = this computer only. Nobody on your wifi can open it.
server.listen(port, "127.0.0.1", () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  Your CRM is running at ${url}\n  Your data is saved in ${store.file}\n  Leave this window open. Press Ctrl+C to stop.\n`);
  if (!process.env.NO_OPEN) {
    const open = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${open} ${url}`, () => {});
  }
});
