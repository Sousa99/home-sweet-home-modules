#!/usr/bin/env node
// Scaffold — render module templates from module.config.yaml (or check for drift).
//
// Contracts: specs/005-module-docs-templatization/contracts/scaffold.md
//   render (default): read module.config.yaml, render the enabled template set, write files.
//   --check:          render in memory, compare to disk, never write.
//   --help:           print usage.
//
// Exit codes:
//   0  render succeeded / check passed
//   1  render failed (invalid config, unresolved token) / check found drift
//   2  usage error

import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";

const CONFIG_FILE = "module.config.yaml";

const USAGE = `Usage: node scripts/scaffold.mjs [--check] [--help]

render (default)  Read module.config.yaml, render the enabled template set, write files.
--check           Render in memory and compare each expected output to disk. Never writes.
--help            Show this help.

Exit codes:
  0  render succeeded / check passed
  1  render failed (invalid config, unresolved token) / check found drift
  2  usage error`;

function parseArgs(argv) {
  const flags = { check: false, help: false };
  for (const arg of argv) {
    if (arg === "--check") flags.check = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else return { error: `unknown option '${arg}'` };
  }
  return { flags };
}

function repoRoot() {
  return resolve(new URL("..", import.meta.url).pathname);
}

// --- Config loading & validation (T004) ---

const REQUIRED_KEYS = [
  "module_name",
  "module_slug",
  "module_description",
  "npm_scope",
  "repo_owner",
  "repo_name",
  "ghcr_org",
  "packages",
  "stack",
  "umbrella_link",
];

const STACK_KEYS = ["backend", "frontend", "tooling"];

const VALID_PACKAGES = ["backend", "frontend"];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SCOPE_PATTERN = /^[a-z0-9]+$/;
const GHCR_PATTERN = /^ghcr\.io\/[a-z0-9]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/;

function validateConfig(config) {
  const errors = [];

  for (const key of REQUIRED_KEYS) {
    const value = config[key];
    if (value === undefined || value === null || value === "") {
      errors.push(`missing or empty required key: ${key}`);
      continue;
    }
    if (key === "packages") {
      if (!Array.isArray(value) || value.length < 1) {
        errors.push(`packages must be a non-empty list`);
      } else {
        for (const pkg of value) {
          if (!VALID_PACKAGES.includes(pkg)) {
            errors.push(
              `packages contains invalid entry '${pkg}' (allowed: ${VALID_PACKAGES.join(", ")})`,
            );
          }
        }
        const unique = new Set(value);
        if (unique.size !== value.length)
          errors.push(`packages contains duplicates`);
      }
    }
    if (key === "stack") {
      for (const sk of STACK_KEYS) {
        if (typeof value[sk] !== "string" || value[sk].trim() === "") {
          errors.push(`missing or empty required key: stack.${sk}`);
        }
      }
    }
  }

  if (
    typeof config.module_slug === "string" &&
    !SLUG_PATTERN.test(config.module_slug)
  ) {
    errors.push(`module_slug must be kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$)`);
  }
  if (
    typeof config.npm_scope === "string" &&
    !SCOPE_PATTERN.test(config.npm_scope)
  ) {
    errors.push(`npm_scope must be alphanumeric without '@' (^[a-z0-9]+$)`);
  }
  if (
    typeof config.ghcr_org === "string" &&
    !GHCR_PATTERN.test(config.ghcr_org)
  ) {
    errors.push(`ghcr_org must match ^ghcr\\.io/[a-z0-9]+$ (registry + owner)`);
  }
  if (
    typeof config.umbrella_link === "string" &&
    !URL_PATTERN.test(config.umbrella_link)
  ) {
    errors.push(`umbrella_link must be a valid http(s) URL`);
  }

  return errors;
}

function loadConfig(root) {
  const file = resolve(root, CONFIG_FILE);
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return { error: `config not found: expected ${CONFIG_FILE} at repo root` };
  }
  if (!raw.trim()) return { error: `config is empty: ${CONFIG_FILE}` };

  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    return { error: `config is invalid YAML: ${err.message}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { error: `config must be a YAML mapping` };
  }

  const errors = validateConfig(parsed);
  if (errors.length > 0) {
    return { errors };
  }

  // Apply theme defaults (optional block).
  if (!parsed.theme || typeof parsed.theme !== "object") parsed.theme = {};
  parsed.theme.primary = parsed.theme.primary || "#d97706";
  parsed.theme.font_sans =
    parsed.theme.font_sans ||
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

  return { config: parsed };
}

// --- Derived values & token inventory (T005, T007) ---

function derivedValues(config) {
  const { npm_scope, module_slug, ghcr_org, backend = {} } = config;
  return {
    MODULE_NAME: config.module_name,
    MODULE_SLUG: module_slug,
    MODULE_DESCRIPTION: config.module_description,
    NPM_SCOPE: npm_scope,
    REPO_OWNER: config.repo_owner,
    REPO_NAME: config.repo_name,
    GHCR_ORG: ghcr_org,
    UMBRELLA_LINK: config.umbrella_link,
    STACK_BACKEND: config.stack.backend,
    STACK_FRONTEND: config.stack.frontend,
    STACK_TOOLING: config.stack.tooling,
    BACKEND_PACKAGE: `@${npm_scope}/${module_slug}-backend`,
    FRONTEND_PACKAGE: `@${npm_scope}/${module_slug}-components`,
    BACKEND_IMAGE: `${ghcr_org}/${module_slug}-backend`,
    SPA_IMAGE: `${ghcr_org}/${module_slug}-frontend`,
    NPM_SCOPE_MAPPING: `@${npm_scope}:registry=https://npm.pkg.github.com/`,
    MCP_SERVER_NAME: module_slug,
    HTTP_ENTRY: backend.http_entry ?? "",
    MCP_ENTRY: backend.mcp_entry ?? "",
    THEME_PRIMARY: config.theme.primary,
    THEME_FONT_SANS: config.theme.font_sans,
  };
}

// --- Template discovery & rendering (T005, T006) ---

const SKIP_PATTERNS = [
  /\/\.git\//,
  /\/node_modules\//,
  /\/dist\//,
  /\/dist-app\//,
  /\/dist-lib\//,
  /\/dist-storybook\//,
  /\/build\//,
  /\/coverage\//,
];

// Files that are the scaffold's own tooling and must never be treated as templates.
const NON_TEMPLATES = new Set([
  "scripts/scaffold.mjs",
  "module.config.yaml",
  "package.json",
  "pnpm-lock.yaml",
  "README.md",
  ".gitignore",
  ".prettierignore",
]);

function walkFiles(dir, out = [], prefix = "") {
  for (const entry of readdirSync(dir)) {
    const abs = resolve(dir, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const rel = `${prefix}${entry}`;
      if (SKIP_PATTERNS.some((p) => p.test(`/${rel}/`))) continue;
      walkFiles(abs, out, `${rel}/`);
    } else if (stat.isFile()) {
      out.push(`${prefix}${entry}`);
    }
  }
  return out;
}

// Template set: every .tpl file in the repo except the scaffold's own tooling.
function discoverTemplates(root) {
  const all = walkFiles(root);
  return all.filter((f) => {
    if (!f.endsWith(".tpl")) return false;
    if (NON_TEMPLATES.has(f)) return false;
    return true;
  });
}

// Skip rules per `packages` (contracts/templates.md).
function isTemplateEnabled(templatePath, packages) {
  const hasBackend = packages.includes("backend");
  const hasFrontend = packages.includes("frontend");
  if (
    !hasBackend &&
    (templatePath.startsWith("backend/") ||
      templatePath === "Dockerfile.backend.tpl")
  ) {
    return false;
  }
  if (
    !hasFrontend &&
    (templatePath.startsWith("frontend/") ||
      templatePath === "Dockerfile.frontend.tpl" ||
      templatePath === "deploy/nginx.spa.conf.tpl")
  ) {
    return false;
  }
  return true;
}

// Substitute known tokens; \{{...}} collapses to literal {{...}}; unknown tokens are errors.
function renderTemplate(content, tokens, templatePath) {
  const unknown = [];
  const rendered = content.replace(
    /(\\?)\{\{([A-Za-z0-9_]+)\}\}/g,
    (match, escaped, name) => {
      if (escaped === "\\") return `{{${name}}}`;
      if (Object.prototype.hasOwnProperty.call(tokens, name))
        return tokens[name];
      unknown.push(name);
      return match;
    },
  );
  if (unknown.length > 0) {
    return {
      error: `${templatePath}: unresolved token(s): ${[...new Set(unknown)].map((n) => `{{${n}}}`).join(", ")}`,
    };
  }
  return { content: rendered };
}

// Conditional directive: {{#if <pkg>}} ... {{/if}} keeps the block iff <pkg> is in packages.
function applyConditionals(content, packages) {
  const pattern = /\{\{#if\s+([a-z0-9_-]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  return content.replace(pattern, (match, name, inner) => {
    return packages.includes(name) ? inner : "";
  });
}

function outputPath(templatePath) {
  return templatePath.endsWith(".tpl")
    ? templatePath.slice(0, -4)
    : templatePath;
}

function renderAll(root, config) {
  const tokens = derivedValues(config);
  const templates = discoverTemplates(root);
  const outputs = [];
  for (const template of templates) {
    if (!isTemplateEnabled(template, config.packages)) continue;
    const abs = resolve(root, template);
    let content = readFileSync(abs, "utf8");
    content = applyConditionals(content, config.packages);
    const result = renderTemplate(content, tokens, template);
    if (result.error) return { errors: [result.error] };
    // Normalize: ensure a trailing newline so rendered output matches Prettier-formatted files.
    const normalized = result.content.endsWith("\n")
      ? result.content
      : `${result.content}\n`;
    outputs.push({
      template,
      output: outputPath(template),
      content: normalized,
    });
  }
  return { outputs };
}

// --- Render mode (writes, atomic) & --check mode (read-only) (T006) ---

function writeOutputs(root, outputs) {
  for (const out of outputs) {
    const abs = resolve(root, out.output);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, out.content);
  }
}

// semantic-release owns the package version; it is bumped in generated package.json files on
// every release. Exclude the `version` field from drift comparison so a post-release repo stays
// in sync with the templates (which carry a template-default version).
function stripVersion(content) {
  return content.replace(/^\s*"version"\s*:\s*"[^"]*",?\s*$/m, "");
}

// Minimal line diff (LCS-based) producing unified-style output. Stdlib only — no dependency.
function lineDiff(expected, actual) {
  const a = expected.split("\n");
  const b = actual.split("\n");
  // Longest common subsequence, then emit -/+ lines.
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push(`    ${a[i]}`);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`-   ${a[i]}`);
      i++;
    } else {
      out.push(`+   ${b[j]}`);
      j++;
    }
  }
  while (i < n) out.push(`-   ${a[i++]}`);
  while (j < m) out.push(`+   ${b[j++]}`);
  return out;
}

function checkMode(root, config, outputs) {
  const states = [];
  for (const out of outputs) {
    const abs = resolve(root, out.output);
    let disk;
    try {
      disk = readFileSync(abs, "utf8");
    } catch {
      states.push({ path: out.output, state: "missing" });
      continue;
    }
    const isPkgJson = /(^|\/)package\.json$/.test(out.output);
    const expected = isPkgJson ? stripVersion(out.content) : out.content;
    const actual = isPkgJson ? stripVersion(disk) : disk;
    if (actual === expected) {
      states.push({ path: out.output, state: "in_sync" });
    } else {
      states.push({
        path: out.output,
        state: "drifted",
        diff: lineDiff(expected, actual),
      });
    }
  }

  // unexpected: a known template output that exists on disk but was NOT produced by this
  // render (e.g. a leftover frontend file in a backend-only module). A file is a "known
  // template output" only if a .tpl template produces it — hand-written app files (src/,
  // specs/ docs, .specify/memory) are never unexpected.
  const produced = new Set(outputs.map((o) => o.output));
  const allOutputs = discoverTemplates(root).map((t) => outputPath(t));
  for (const f of walkFiles(root)) {
    if (f.endsWith(".tpl")) continue;
    if (NON_TEMPLATES.has(f)) continue;
    if (!allOutputs.includes(f)) continue;
    if (produced.has(f)) continue;
    states.push({ path: f, state: "unexpected" });
  }

  return states;
}

function reportStates(states) {
  let ok = true;
  const MAX_DIFF_LINES = 20;
  for (const s of states) {
    if (s.state === "in_sync") continue;
    ok = false;
    console.error(`  ${s.state}: ${s.path}`);
    if (s.diff && s.diff.length > 0) {
      const shown = s.diff.slice(0, MAX_DIFF_LINES);
      for (const line of shown) console.error(line);
      const hidden = s.diff.length - shown.length;
      if (hidden > 0) console.error(`  … ${hidden} more line(s) differ`);
    }
  }
  return ok;
}

function main() {
  const { flags, error } = parseArgs(process.argv.slice(2));
  if (error) {
    console.error(`error: ${error}`);
    console.error(USAGE);
    process.exit(2);
  }
  if (flags.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const root = repoRoot();
  const { config, errors, error: loadError } = loadConfig(root);
  if (loadError) {
    console.error(`error: ${loadError}`);
    process.exit(1);
  }
  if (errors && errors.length > 0) {
    for (const e of errors) console.error(`config error: ${e}`);
    process.exit(1);
  }

  const { outputs, errors: renderErrors } = renderAll(root, config);
  if (renderErrors && renderErrors.length > 0) {
    for (const e of renderErrors) console.error(`render error: ${e}`);
    process.exit(1);
  }

  if (flags.check) {
    const states = checkMode(root, config, outputs);
    const ok = reportStates(states);
    process.exit(ok ? 0 : 1);
  }

  writeOutputs(root, outputs);
  console.log(`[scaffold] rendered ${outputs.length} template(s)`);
  for (const out of outputs) console.log(`  ${out.output}`);
  process.exit(0);
}

main();
