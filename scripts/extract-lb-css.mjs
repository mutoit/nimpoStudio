import fs from "fs";

const p = "src/components/LibraryBrowser.astro";
const s = fs.readFileSync(p, "utf8");
const re = /<style is:global>([\s\S]*?)<\/style>/;
const m = s.match(re);
if (!m) {
  console.error("no style block");
  process.exit(1);
}
const css = m[1].trim();
fs.mkdirSync("src/styles", { recursive: true });
fs.writeFileSync(
  "src/styles/library-browser.css",
  `/* Extracted from LibraryBrowser.astro — library public UI */\n${css}\n`,
);
let out = s.replace(re, "");
if (!out.includes("library-browser.css")) {
  out = out.replace(
    /^---\n/,
    `---\nimport "../styles/library-browser.css";\n`,
  );
}
fs.writeFileSync(p, out);
console.log("ok css", css.length, "astro", fs.statSync(p).size);
