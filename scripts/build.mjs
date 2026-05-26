import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

await build({
  root,
  configFile: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        status: resolve(root, "status.html"),
        support: resolve(root, "support.html"),
        vendor: resolve(root, "vendor.html"),
        order: resolve(root, "order.html"),
        bulk: resolve(root, "bulk.html"),
        bizDashboard: resolve(root, "biz-dashboard.html"),
        bizRegister: resolve(root, "biz-register.html"),
        bizPoints: resolve(root, "biz-points.html"),
        bizWithdraw: resolve(root, "biz-withdraw.html"),
        bizHistory: resolve(root, "biz-history.html"),
      },
    },
  },
});
