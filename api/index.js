// Vercel Serverless Function entry point for MediServe Express API
let serverApp;

module.exports = (req, res) => {
  if (!serverApp) {
    const imported = require("../dist/server/index.js");
    serverApp = imported.default || imported;
  }
  return serverApp(req, res);
};

