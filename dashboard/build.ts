import tailwind from "bun-plugin-tailwind";
import { rm } from "node:fs/promises";
import path from "node:path";

const outdir = path.join(import.meta.dir, "dist");
await rm(outdir, { recursive: true, force: true }).catch(() => {});

const entrypoints = [...new Bun.Glob("src/**/*.html").scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

for (const output of result.outputs) {
  console.log(
    ` ${path.relative(import.meta.dir, output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
  );
}
