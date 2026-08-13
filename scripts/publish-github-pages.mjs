import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const input = [];
const reader = readline.createInterface({ input: process.stdin, terminal: false });
reader.on("line", line => {
  input.push(line.trim());
  if (input.length === 1) reader.close();
});
await new Promise(resolve => reader.once("close", resolve));
const [fineToken] = input;
const classicToken = "";
if (!fineToken) throw new Error("A GitHub token is required on stdin");

const api = async (token, route, options = {}) => {
  const response = await fetch(`https://api.github.com${route}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "VLADBOT-accounting-publisher",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text.slice(0, 500) }; }
  return { response, body };
};

const testToken = async (label, token) => {
  const { response, body } = await api(token, "/user");
  return {
    label,
    valid: response.ok && Boolean(body.login),
    status: response.status,
    login: response.ok ? body.login : null,
    scopes: response.headers.get("x-oauth-scopes") || null,
  };
};

const fine = await testToken("fine-grained", fineToken);
const classic = await testToken("classic", classicToken);
if (!fine.valid && !classic.valid) throw new Error("Neither GitHub token authenticated successfully");

const preferredName = "vladbot-accounting-frozen-header";
const candidates = [preferredName, `${preferredName}-20260812`, `${preferredName}-${Date.now()}`];
const tokenOptions = [
  ...(classic.valid ? [{ token: classicToken, identity: classic }] : []),
  ...(fine.valid ? [{ token: fineToken, identity: fine }] : []),
];

let created;
let selectedToken;
for (const option of tokenOptions) {
  for (const name of candidates) {
    const existing = await api(option.token, `/repos/${option.identity.login}/${name}`);
    if (existing.response.ok) continue;
    const result = await api(option.token, "/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: "Public read-only ACCOUNTING_ALL_PERIODS_V2 view with one frozen header",
        private: false,
        has_issues: false,
        has_projects: false,
        has_wiki: false,
        auto_init: false,
      }),
    });
    if (result.response.ok) {
      created = result.body;
      selectedToken = option.token;
      break;
    }
    if (![403, 404, 422].includes(result.response.status)) {
      throw new Error(`GitHub repository creation failed (${result.response.status}): ${result.body.message || "unknown error"}`);
    }
  }
  if (created) break;
}
if (!created || !selectedToken) throw new Error("The tokens authenticate, but neither is allowed to create a public repository");

const runGit = (args, env = {}) => {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${(result.stderr || result.stdout).trim().slice(0, 1000)}`);
  return result.stdout.trim();
};

runGit(["config", "user.name", created.owner.login]);
runGit(["config", "user.email", `${created.owner.id}+${created.owner.login}@users.noreply.github.com`]);
runGit(["add", "."]);
runGit(["commit", "-m", "Publish ACCOUNTING_ALL_PERIODS_V2 webpage"]);
runGit(["remote", "add", "origin", created.clone_url]);

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "github-askpass-"));
const askpass = path.join(tempDirectory, "askpass.sh");
fs.writeFileSync(askpass, "#!/bin/sh\ncase \"$1\" in\n  *Username*) printf '%s\\n' 'x-access-token' ;;\n  *Password*) printf '%s\\n' \"$GITHUB_PUSH_TOKEN\" ;;\nesac\n", { mode: 0o700 });
try {
  runGit(["push", "-u", "origin", "main"], {
    GIT_ASKPASS: askpass,
    GIT_TERMINAL_PROMPT: "0",
    GITHUB_PUSH_TOKEN: selectedToken,
  });
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

const owner = created.owner.login;
const repo = created.name;
const pagesCreate = await api(selectedToken, `/repos/${owner}/${repo}/pages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ source: { branch: "main", path: "/docs" } }),
});
if (!pagesCreate.response.ok && pagesCreate.response.status !== 409) {
  throw new Error(`GitHub Pages enablement failed (${pagesCreate.response.status}): ${pagesCreate.body.message || "unknown error"}`);
}

let pages;
let buildStatus = "queued";
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const state = await api(selectedToken, `/repos/${owner}/${repo}/pages`);
  if (state.response.ok) pages = state.body;
  const build = await api(selectedToken, `/repos/${owner}/${repo}/pages/builds/latest`);
  if (build.response.ok) buildStatus = build.body.status || buildStatus;
  if (buildStatus === "built" || buildStatus === "errored") break;
}

console.log(JSON.stringify({
  tokens: { fineGrained: fine, classic },
  repository: created.html_url,
  pages: pages?.html_url || `https://${owner}.github.io/${repo}/`,
  buildStatus,
}, null, 2));
