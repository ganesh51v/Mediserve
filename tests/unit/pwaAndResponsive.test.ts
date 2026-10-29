import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("PWA Specification, Manifest & Service Worker Verification", () => {
  const rootDir = process.cwd();

  test("Manifest file exists and conforms to W3C Web App Manifest specifications", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.webmanifest");
    assert.ok(fs.existsSync(manifestPath), "manifest.webmanifest must exist in public/");

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.ok(manifestContent.name, "Manifest must specify name");
    assert.ok(manifestContent.short_name, "Manifest must specify short_name");
    assert.strictEqual(manifestContent.start_url, "/", "start_url must be '/'");
    assert.strictEqual(manifestContent.display, "standalone", "display must be 'standalone'");
    assert.ok(manifestContent.theme_color, "Manifest must specify theme_color");
    assert.ok(manifestContent.background_color, "Manifest must specify background_color");
  });

  test("Manifest contains standard and maskable icons at both 192x192 and 512x512 sizes", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.webmanifest");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    const icons = manifest.icons || [];
    assert.ok(Array.isArray(icons), "icons must be an array");

    // Check standard 192 and 512
    const icon192Any = icons.find((i: any) => i.sizes === "192x192" && (i.purpose === "any" || !i.purpose));
    const icon512Any = icons.find((i: any) => i.sizes === "512x512" && (i.purpose === "any" || !i.purpose));
    assert.ok(icon192Any, "Standard 192x192 icon must be present");
    assert.ok(icon512Any, "Standard 512x512 icon must be present");

    // Check maskable 192 and 512
    const icon192Maskable = icons.find((i: any) => i.sizes === "192x192" && i.purpose === "maskable");
    const icon512Maskable = icons.find((i: any) => i.sizes === "512x512" && i.purpose === "maskable");
    assert.ok(icon192Maskable, "Maskable 192x192 icon must be present");
    assert.ok(icon512Maskable, "Maskable 512x512 icon must be present");

    // Verify all icon files physically exist and are valid PNGs (PNG header: 89 50 4E 47)
    for (const icon of [icon192Any, icon512Any, icon192Maskable, icon512Maskable]) {
      const iconPath = path.join(rootDir, "public", icon.src.replace(/^\//, ""));
      assert.ok(fs.existsSync(iconPath), `Icon file ${icon.src} must physically exist`);
      const buffer = fs.readFileSync(iconPath);
      assert.ok(buffer.length > 100, `Icon file ${icon.src} must not be empty`);
      assert.strictEqual(buffer[0], 0x89, "PNG magic byte 0");
      assert.strictEqual(buffer[1], 0x50, "PNG magic byte 1 (P)");
      assert.strictEqual(buffer[2], 0x4e, "PNG magic byte 2 (N)");
      assert.strictEqual(buffer[3], 0x47, "PNG magic byte 3 (G)");
    }
  });

  test("HTML entry points link the manifest and include mobile/PWA viewport meta tags", () => {
    const indexHtmlPath = path.join(rootDir, "index.html");
    assert.ok(fs.existsSync(indexHtmlPath), "index.html must exist at root");

    const html = fs.readFileSync(indexHtmlPath, "utf-8");
    assert.ok(
      html.includes('rel="manifest"') && html.includes('manifest.webmanifest'),
      "index.html must link to manifest.webmanifest"
    );
    assert.ok(
      html.includes('name="viewport"') && html.includes("width=device-width"),
      "index.html must include responsive viewport meta tag"
    );
    assert.ok(
      html.includes('name="theme-color"') && html.includes("#0D9488"),
      "index.html must specify theme-color matching MediServe clinical palette"
    );
    assert.ok(
      html.includes('rel="apple-touch-icon"'),
      "index.html must link apple-touch-icon for iOS standalone installability"
    );
  });

  test("Service Worker public/sw.js includes versioning, caching strategies, and offline fallback", () => {
    const swPath = path.join(rootDir, "public", "sw.js");
    assert.ok(fs.existsSync(swPath), "sw.js must exist in public/");

    const swCode = fs.readFileSync(swPath, "utf-8");
    assert.ok(swCode.includes("STATIC_CACHE"), "Service Worker must define static cache");
    assert.ok(swCode.includes("DYNAMIC_CACHE"), "Service Worker must define dynamic cache");
    assert.ok(swCode.includes("skipWaiting"), "Service Worker must support skipWaiting for clean updates");
    assert.ok(swCode.includes("clients.claim"), "Service Worker must claim clients on activation");
    assert.ok(swCode.includes("navigate"), "Service Worker must handle navigation requests");
    assert.ok(swCode.includes("/index.html"), "Service Worker must provide offline SPA app shell fallback");
    assert.ok(swCode.includes("/api/"), "Service Worker must handle dynamic API caching");
  });

  test("Client PWA registration module exports expected lifecycle interfaces", async () => {
    const pwaModulePath = path.join(rootDir, "src", "pwa.ts");
    assert.ok(fs.existsSync(pwaModulePath), "src/pwa.ts must exist");

    const pwaCode = fs.readFileSync(pwaModulePath, "utf-8");
    assert.ok(pwaCode.includes("registerServiceWorker"), "Must export registerServiceWorker");
    assert.ok(pwaCode.includes("promptPwaInstall"), "Must export promptPwaInstall");
    assert.ok(pwaCode.includes("isPwaInstallable"), "Must export isPwaInstallable");
    assert.ok(pwaCode.includes("beforeinstallprompt"), "Must handle beforeinstallprompt event");
  });

  test("CSS defines fluid media scaling and responsive constraints for small screens", () => {
    const cssPath = path.join(rootDir, "src", "index.css");
    const css = fs.readFileSync(cssPath, "utf-8");
    assert.ok(css.includes("min-width: 320px"), "CSS must establish min-width: 320px support");
    assert.ok(css.includes("overflow-x: hidden"), "CSS must prevent page-level horizontal overflow");
    assert.ok(css.includes("max-width: 100%"), "Media elements must have max-width: 100% responsive fluid scaling");
  });
});

