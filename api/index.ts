import app from "../server/index";

export default function handler(req: any, res: any) {
  // If Vercel stripped the /api prefix from req.url, restore it so Express routes match
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  return app(req, res);
}

