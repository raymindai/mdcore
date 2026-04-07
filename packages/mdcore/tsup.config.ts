import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  onSuccess: async () => {
    // Copy WASM binary to dist/
    const wasmSrc = join("wasm", "mdcore_engine_bg.wasm");
    const distDir = "dist";
    if (existsSync(wasmSrc)) {
      mkdirSync(distDir, { recursive: true });
      copyFileSync(wasmSrc, join(distDir, "mdcore_engine_bg.wasm"));
      console.log("✓ Copied WASM binary to dist/");
    }
  },
});
