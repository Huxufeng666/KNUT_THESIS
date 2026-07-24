import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(appDir, "..");
const publicDir = path.join(appDir, "public");
const dataRoot = path.resolve(process.env.KNUT_DATA_ROOT || "/var/lib/knut-thesis");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const documentDirName = "KNUT-Thesis-Files";
const mainTexRelative = `${documentDirName}/manuscript.tex`;
const mainPdfRelative = `${documentDirName}/manuscript.pdf`;
const allowedExtensions = new Set([".tex", ".bib", ".sty", ".cls"]);
const templateEntries = ["abstract", "chapters", "figures", "frontmatters", "titlePages", documentDirName];
const workspacePromises = new Map();

if (!supabaseUrl || !publishableKey) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4_000_000) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function authenticate(req) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("请先登录");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  if (!response.ok) throw new Error("登录已失效，请重新登录");
  const user = await response.json();
  if (!/^[0-9a-f-]{36}$/i.test(user.id || "")) throw new Error("无效的用户身份");
  return user;
}

function userRoot(userId) {
  return path.join(dataRoot, "users", userId);
}

async function ensureWorkspace(userId) {
  if (workspacePromises.has(userId)) return workspacePromises.get(userId);
  const promise = (async () => {
    const root = userRoot(userId);
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const marker = path.join(root, ".initialized");
    const mainTex = path.join(root, mainTexRelative);
    if (!fsSync.existsSync(marker) || !fsSync.existsSync(mainTex)) {
      for (const entry of templateEntries) {
        const source = path.join(templateRoot, entry);
        if (fsSync.existsSync(source)) {
          await fs.cp(source, path.join(root, entry), {
            recursive: true,
            force: false,
            errorOnExist: false,
          });
        }
      }
      await fs.writeFile(marker, new Date().toISOString(), { mode: 0o600 });
    }
    return root;
  })().finally(() => workspacePromises.delete(userId));
  workspacePromises.set(userId, promise);
  return promise;
}

function safeProjectPath(root, relativePath) {
  if (!relativePath || typeof relativePath !== "string") throw new Error("缺少文件路径");
  const normalized = relativePath.replaceAll("/", path.sep);
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("文件路径不安全");
  return resolved;
}

async function listFiles(root, dir = root, base = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(root, full, rel));
    else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) output.push(rel);
  }
  return output;
}

function findCommand(command) {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const folder of String(process.env.PATH || "").split(path.delimiter)) {
    for (const ext of extensions) {
      const candidate = path.join(folder.replace(/^"|"$/g, ""), command + ext);
      if (fsSync.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function runProcess(root, command, args, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, openout_any: "p", openin_any: "a", shell_escape: "f" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", data => { log = (log + data.toString()).slice(-30000); });
    child.stderr.on("data", data => { log = (log + data.toString()).slice(-30000); });
    child.on("error", error => { clearTimeout(timer); resolve({ ok: false, code: -1, log: error.message }); });
    child.on("close", code => { clearTimeout(timer); resolve({ ok: code === 0, code, log }); });
  });
}

async function compileLatex(root) {
  const xelatex = findCommand("xelatex");
  const biber = findCommand("biber");
  if (!xelatex) return { ok: false, missing: true, log: "服务器尚未安装 XeLaTeX。" };
  const args = [
    "-no-shell-escape",
    "-synctex=1",
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-file-line-error",
    `-output-directory=${documentDirName}`,
    mainTexRelative,
  ];
  const logs = [];
  const first = await runProcess(root, xelatex, args);
  logs.push(first.log);
  if (!first.ok) return { ok: false, code: first.code, log: logs.join("\n").slice(-24000) };
  const bibliography = path.join(root, documentDirName, "references.bib");
  if (biber && fsSync.existsSync(bibliography) && fsSync.statSync(bibliography).size > 0) {
    const bib = await runProcess(root, biber, [`${documentDirName}/manuscript`]);
    logs.push(bib.log);
    if (!bib.ok) return { ok: false, code: bib.code, log: logs.join("\n").slice(-24000) };
  }
  for (let index = 0; index < 2; index++) {
    const result = await runProcess(root, xelatex, args);
    logs.push(result.log);
    if (!result.ok) return { ok: false, code: result.code, log: logs.join("\n").slice(-24000) };
  }
  return { ok: true, engine: path.basename(xelatex), log: logs.join("\n").slice(-24000) };
}

async function updateProjectReferences(root, oldRelativePath, newRelativePath) {
  const oldExt = path.posix.extname(oldRelativePath);
  const newExt = path.posix.extname(newRelativePath);
  const replacements = [
    [`{${oldRelativePath}}`, `{${newRelativePath}}`],
    [`{${oldExt ? oldRelativePath.slice(0, -oldExt.length) : oldRelativePath}}`, `{${newExt ? newRelativePath.slice(0, -newExt.length) : newRelativePath}}`],
  ];
  const updated = [];
  for (const relativeFile of await listFiles(root)) {
    const full = safeProjectPath(root, relativeFile);
    let content = await fs.readFile(full, "utf8");
    let next = content;
    for (const [from, to] of replacements) next = next.split(from).join(to);
    if (next !== content) {
      await fs.writeFile(full, next, "utf8");
      updated.push(relativeFile);
    }
  }
  return updated;
}

async function aiEdit(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("服务器尚未配置 AI 功能");
  const actions = {
    polish: "在不改变事实、引用和 LaTeX 命令的前提下，将内容润色为严谨、自然的学术写作。",
    expand: "基于原意适度扩写，增强论证与衔接，不得虚构数据、来源或引用。",
    shorten: "压缩冗余表述，保留核心论点、事实、引用和 LaTeX 结构。",
    translate_en: "翻译为规范的学术英语，保留所有 LaTeX 命令、公式和引用。",
    translate_zh: "翻译为自然、严谨的学术中文，保留所有 LaTeX 命令、公式和引用。",
    custom: body.instruction || "根据用户要求改写。",
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      instructions: "你是严谨的学术论文编辑。只输出可直接替换原文的 LaTeX 正文，不写解释，不使用 Markdown 代码围栏。",
      input: `任务：${actions[body.action] || actions.custom}\n\n待处理内容：\n${body.text || ""}`,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "AI 请求失败");
  const text = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text).join("");
  if (!text) throw new Error("AI 没有返回可用文本");
  return text;
}

async function serveStatic(urlPath, res) {
  const name = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const full = path.resolve(publicDir, name);
  if (full !== path.join(publicDir, "index.html") && !full.startsWith(publicDir + path.sep)) return false;
  try {
    const data = await fs.readFile(full);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8" };
    res.writeHead(200, {
      "Content-Type": types[path.extname(full)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url, root, user) {
  if (req.method === "GET" && url.pathname === "/api/files") return json(res, 200, { files: await listFiles(root), projectRoot: `用户空间/${user.id.slice(0, 8)}` });
  if (req.method === "GET" && url.pathname === "/api/file") {
    const file = url.searchParams.get("path");
    return json(res, 200, { path: file, content: await fs.readFile(safeProjectPath(root, file), "utf8") });
  }
  if (req.method === "PUT" && url.pathname === "/api/file") {
    const body = await readJson(req);
    const full = safeProjectPath(root, body.path);
    if (!allowedExtensions.has(path.extname(full).toLowerCase())) throw new Error("不支持保存这种文件类型");
    await fs.writeFile(full, String(body.content ?? ""), "utf8");
    return json(res, 200, { ok: true, compile: body.compile === false ? null : await compileLatex(root) });
  }
  if (req.method === "POST" && url.pathname === "/api/autosave") {
    const body = await readJson(req);
    const full = safeProjectPath(root, body.path);
    if (!allowedExtensions.has(path.extname(full).toLowerCase())) throw new Error("不支持保存这种文件类型");
    await fs.writeFile(full, String(body.content ?? ""), "utf8");
    return json(res, 200, { ok: true, savedAt: new Date().toISOString() });
  }
  if (req.method === "GET" && url.pathname === "/api/sync/export") {
    const files = [];
    for (const relativePath of await listFiles(root)) files.push({ path: relativePath, content: await fs.readFile(safeProjectPath(root, relativePath), "utf8") });
    return json(res, 200, { files });
  }
  if (req.method === "POST" && url.pathname === "/api/sync/import") {
    const body = await readJson(req);
    if (!Array.isArray(body.files) || body.files.length > 500) throw new Error("云端文件数据无效");
    for (const item of body.files) {
      const relativePath = String(item?.path || "").replaceAll("\\", "/");
      const full = safeProjectPath(root, relativePath);
      if (!allowedExtensions.has(path.extname(full).toLowerCase())) throw new Error(`不支持同步文件：${relativePath}`);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, String(item?.content ?? ""), "utf8");
    }
    return json(res, 200, { ok: true, imported: body.files.length, compile: body.compile === false ? null : await compileLatex(root) });
  }
  if (req.method === "POST" && url.pathname === "/api/rename") {
    const body = await readJson(req);
    const oldRelativePath = String(body.path || "").replaceAll("\\", "/");
    const newName = String(body.newName || "").trim();
    if (oldRelativePath.toLowerCase() === mainTexRelative.toLowerCase()) throw new Error("manuscript.tex 是论文主入口，不能重命名");
    if (!newName || newName.includes("/") || newName.includes("\\")) throw new Error("请输入有效的新文件名");
    const oldFull = safeProjectPath(root, oldRelativePath);
    const newRelativePath = path.posix.join(path.posix.dirname(oldRelativePath), newName);
    const newFull = safeProjectPath(root, newRelativePath);
    if (!allowedExtensions.has(path.extname(newFull).toLowerCase())) throw new Error("不支持这种扩展名");
    if (fsSync.existsSync(newFull)) throw new Error("同一目录中已经存在这个文件名");
    await fs.rename(oldFull, newFull);
    return json(res, 200, { ok: true, path: newRelativePath, updatedReferences: await updateProjectReferences(root, oldRelativePath, newRelativePath) });
  }
  if (req.method === "POST" && url.pathname === "/api/compile") return json(res, 200, await compileLatex(root));
  if (req.method === "POST" && url.pathname === "/api/ai") return json(res, 200, { text: await aiEdit(await readJson(req)) });
  if (req.method === "GET" && url.pathname === "/api/pdf") {
    const pdf = path.join(root, mainPdfRelative);
    const stat = await fs.stat(pdf);
    res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": stat.size, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    return fsSync.createReadStream(pdf).pipe(res);
  }
  if (req.method === "POST" && url.pathname === "/api/synctex") {
    const body = await readJson(req);
    const page = Number(body.page), x = Number(body.x), y = Number(body.y);
    const synctex = findCommand("synctex");
    if (!synctex) throw new Error("服务器尚未安装 SyncTeX");
    const result = await runProcess(root, synctex, ["edit", "-o", `${page}:${x.toFixed(2)}:${y.toFixed(2)}:${mainPdfRelative}`], 15000);
    const inputMatch = result.log.match(/^Input:(.+)$/m);
    const lineMatch = result.log.match(/^Line:(\d+)$/m);
    if (!inputMatch || !lineMatch) throw new Error("此 PDF 位置没有对应源码");
    const absolute = path.resolve(root, inputMatch[1].trim());
    if (!absolute.startsWith(root + path.sep)) throw new Error("定位结果无效");
    return json(res, 200, { ok: true, path: path.relative(root, absolute).replaceAll(path.sep, "/"), line: Number(lineMatch[1]), method: "synctex" });
  }
  return json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === "GET" && url.pathname === "/api/config") {
      return json(res, 200, { mode: "production", supabaseUrl });
    }
    if (url.pathname.startsWith("/api/")) {
      const user = await authenticate(req);
      const root = await ensureWorkspace(user.id);
      return await handleApi(req, res, url, root, user);
    }
    if (await serveStatic(url.pathname, res)) return;
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /登录|身份/.test(message) ? 401 : 400;
    return json(res, status, { error: message });
  }
});

server.listen(port, host, async () => {
  await fs.mkdir(path.join(dataRoot, "users"), { recursive: true, mode: 0o700 });
  console.log(`KNUT Thesis Studio production server: http://${host}:${port}`);
  console.log(`User data root: ${dataRoot}`);
});
