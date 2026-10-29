import app from "../server/index";

export default function handler(req: any, res: any) {
  try {
    // 1. If Vercel Node runtime already parsed req.body, mark it so body-parser does not hang
    if (req.body !== undefined && !req._body) {
      req._body = true;
    }

    // 2. Extract original request URL
    const originalUrl =
      (req.headers["x-matched-path"] as string) ||
      (req.headers["x-vercel-matched-path"] as string) ||
      (req.headers["x-forwarded-uri"] as string) ||
      (req.headers["x-original-url"] as string);

    if (originalUrl && typeof originalUrl === "string") {
      const queryIdx = req.url ? req.url.indexOf("?") : -1;
      const queryStr = queryIdx !== -1 ? req.url.slice(queryIdx) : "";
      req.url = originalUrl.includes("?") ? originalUrl : `${originalUrl}${queryStr}`;
    } else if (req.query && req.query.__path) {
      const pathParam = Array.isArray(req.query.__path) ? req.query.__path.join("/") : req.query.__path;
      const cleanPath = String(pathParam).replace(/^\/+/, "");
      // Reconstruct query parameters excluding __path
      const queryParams = new URLSearchParams();
      if (typeof req.query === "object") {
        for (const [k, v] of Object.entries(req.query)) {
          if (k !== "__path" && v !== undefined) {
            queryParams.set(k, String(v));
          }
        }
      }
      const q = queryParams.toString();
      req.url = `/api/${cleanPath}${q ? `?${q}` : ""}`;
    } else if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
    }

    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Handler Error]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal Serverless Function Error" });
    }
  }
}
