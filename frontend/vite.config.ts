import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    define: {
        // Disable React DevTools Profiler to prevent DataCloneError memory issues
        // The profiler tries to clone large state objects causing "out of memory" errors
        __REACT_DEVTOOLS_GLOBAL_HOOK__: "({ isDisabled: true })",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        host: true,
        watch: {
            usePolling: true,
            interval: 100,
        },
        hmr: {
            overlay: true,
        },
        proxy: {
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
