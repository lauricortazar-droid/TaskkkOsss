// Hostinger entry point. Run npm run build before starting.
process.env.NODE_ENV = "production";
await import("./dist/server.cjs");
