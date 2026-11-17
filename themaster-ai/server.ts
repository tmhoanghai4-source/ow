import express from "express";
import path from "path";
import dotenv from "dotenv";
import handler, { createApiApp } from "./api/_app.js";

dotenv.config();

async function createFullServer() {
  const app = await createApiApp();

  const distPath = path.join(process.cwd(), 'dist');
  app.use('/asset', express.static(path.join(distPath, 'asset')));
  app.use('/asset', express.static(path.join(process.cwd(), 'public/asset')));
  app.use('/asset', express.static(path.join(process.cwd(), 'asset')));

  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.VERCEL !== "1") {
    app.use(express.static(distPath));
    app.use((req: any, res: any, next: any) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export default handler;

if (process.env.VERCEL !== '1' && (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.cjs') || process.env.NODE_ENV !== 'production')) {
  createFullServer().then(app => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TheMaster Server running on http://localhost:${PORT}`);
    });
  });
}
