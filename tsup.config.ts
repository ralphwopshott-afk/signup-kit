import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", clerk: "src/clerk/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@clerk/clerk-react",
    "@zxcvbn-ts/core",
    "@zxcvbn-ts/language-common",
    "@zxcvbn-ts/language-en",
  ],
});
