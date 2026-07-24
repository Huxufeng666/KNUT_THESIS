import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(appDir, "..");
const publicDir = path.join(appDir, "public");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const allowedExtensions = new Set([".tex", ".bib", ".md", ".txt", ".sty", ".cls"]);

loadEnv(path.join(appDir, ".env"));

function loadEnv(file) {
  if (!fsSync.existsSync(file)) return;
  const lines = fsSync.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function safeProjectPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") throw new Error("缺少文件路径");
  const normalized = relativePath.replaceAll("/", path.sep);
  const resolved = path.resolve(projectRoot, normalized);
  if (resolved !== projectRoot && !resolved.startsWith(projectRoot + path.sep)) {
    throw new Error("文件路径不安全");
  }
  if (resolved.startsWith(appDir + path.sep)) throw new Error("不能通过编辑器修改应用文件");
  return resolved;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.length > 2_000_000) throw new Error("请求内容过大");
  return text ? JSON.parse(text) : {};
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function listFiles(dir = projectRoot, base = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if ([".git", "local-app", "node_modules"].includes(entry.name)) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(full, rel));
    else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) output.push(rel);
  }
  return output;
}

async function updateProjectReferences(oldRelativePath, newRelativePath) {
  const oldExt = path.posix.extname(oldRelativePath);
  const newExt = path.posix.extname(newRelativePath);
  const oldWithoutExt = oldExt ? oldRelativePath.slice(0, -oldExt.length) : oldRelativePath;
  const newWithoutExt = newExt ? newRelativePath.slice(0, -newExt.length) : newRelativePath;
  const replacements = [
    [`{${oldRelativePath}}`, `{${newRelativePath}}`],
    [`{${oldWithoutExt}}`, `{${newWithoutExt}}`],
  ];
  const updated = [];
  for (const relativeFile of await listFiles()) {
    const full = safeProjectPath(relativeFile);
    let content;
    try { content = await fs.readFile(full, "utf8"); } catch { continue; }
    let next = content;
    for (const [from, to] of replacements) next = next.split(from).join(to);
    if (next !== content) {
      await fs.writeFile(full, next, "utf8");
      updated.push(relativeFile);
    }
  }
  return updated;
}

function findCommand(command) {
  const preferredFolders = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "MiKTeX", "miktex", "bin", "x64"),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "MiKTeX", "miktex", "bin", "x64"),
  ].filter(Boolean);
  const pathValue = process.env.PATH || "";
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const folder of [...preferredFolders, ...pathValue.split(path.delimiter)]) {
    for (const ext of extensions) {
      const candidate = path.join(folder.replace(/^"|"$/g, ""), command + ext);
      if (fsSync.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: projectRoot, windowsHide: true });
    let log = "";
    child.stdout.on("data", (data) => { log += data.toString(); });
    child.stderr.on("data", (data) => { log += data.toString(); });
    child.on("error", (error) => resolve({ ok: false, code: -1, log: error.message }));
    child.on("close", (code) => resolve({ ok: code === 0, code, log }));
  });
}

async function compileLatex() {
  const xelatex = findCommand("xelatex");
  const pdflatex = findCommand("pdflatex");
  const biber = findCommand("biber");
  const engine = xelatex || pdflatex;
  if (!engine) {
    return { ok: false, missing: true, log: "未检测到 LaTeX 编译器。请安装 MiKTeX，安装后重启本编辑器。当前已有 manuscript.pdf 仍可预览。" };
  }

  const engineArgs = ["--enable-installer", "-synctex=1", "-interaction=nonstopmode", "-file-line-error", "manuscript.tex"];
  const logs = [];
  const first = await runProcess(engine, engineArgs);
  logs.push(first.log);
  if (!first.ok) return { ok: false, code: first.code, log: logs.join("\n").slice(-24000) };

  const bibliography = path.join(projectRoot, "references.bib");
  if (biber && fsSync.existsSync(bibliography) && fsSync.statSync(bibliography).size > 0) {
    const bibResult = await runProcess(biber, ["manuscript"]);
    logs.push(bibResult.log);
    if (!bibResult.ok) return { ok: false, code: bibResult.code, log: logs.join("\n").slice(-24000) };
  }

  const second = await runProcess(engine, engineArgs);
  logs.push(second.log);
  if (!second.ok) return { ok: false, code: second.code, log: logs.join("\n").slice(-24000) };
  const third = await runProcess(engine, engineArgs);
  logs.push(third.log);
  return { ok: third.ok, code: third.code, engine: path.basename(engine), log: logs.join("\n").slice(-24000) };
}

async function aiEdit(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("尚未配置 OPENAI_API_KEY。请把 local-app/.env.example 复制为 .env 并填入密钥。");
  const actions = {
    polish: "在不改变事实、引用和 LaTeX 命令的前提下，将内容润色为严谨、自然的学术写作。",
    expand: "基于原意适度扩写，增强论证与衔接，不得虚构数据、来源或引用。",
    shorten: "压缩冗余表述，保留核心论点、事实、引用和 LaTeX 结构。",
    translate_en: "翻译为规范的学术英语，保留所有 LaTeX 命令、公式和引用。",
    translate_zh: "翻译为自然、严谨的学术中文，保留所有 LaTeX 命令、公式和引用。",
    custom: body.instruction || "根据用户要求改写。",
  };
  const instruction = actions[body.action] || actions.custom;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      instructions: "你是严谨的学术论文编辑。只输出可直接替换原文的 LaTeX 正文，不写解释，不使用 Markdown 代码围栏。绝不捏造事实、结果或文献。",
      input: `任务：${instruction}\n\n文件：${body.file || "未知"}\n\n待处理内容：\n${body.text || ""}`,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "AI 请求失败");
  const text = (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("");
  if (!text) throw new Error("AI 没有返回可用文本");
  return text;
}

async function serveStatic(urlPath, res) {
  const name = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const full = path.resolve(publicDir, name);
  if (!full.startsWith(publicDir + path.sep) && full !== path.join(publicDir, "index.html")) return false;
  try {
    const data = await fs.readFile(full);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
    res.writeHead(200, { "Content-Type": types[path.extname(full)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
    return true;
  } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method === "GET" && url.pathname === "/api/files") return json(res, 200, { files: await listFiles(), projectRoot });
    if (req.method === "GET" && url.pathname === "/api/file") {
      const file = url.searchParams.get("path");
      const full = safeProjectPath(file);
      return json(res, 200, { path: file, content: await fs.readFile(full, "utf8") });
    }
    if (req.method === "PUT" && url.pathname === "/api/file") {
      const body = await readJson(req);
      const full = safeProjectPath(body.path);
      if (!allowedExtensions.has(path.extname(full).toLowerCase())) throw new Error("不支持保存这种文件类型");
      await fs.writeFile(full, String(body.content ?? ""), "utf8");
      const result = body.compile === false ? null : await compileLatex();
      return json(res, 200, { ok: true, compile: result });
    }
    if (req.method === "POST" && url.pathname === "/api/autosave") {
      const body = await readJson(req);
      const full = safeProjectPath(body.path);
      if (!allowedExtensions.has(path.extname(full).toLowerCase())) throw new Error("不支持保存这种文件类型");
      await fs.writeFile(full, String(body.content ?? ""), "utf8");
      return json(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }
    if (req.method === "POST" && url.pathname === "/api/rename") {
      const body = await readJson(req);
      const oldRelativePath = String(body.path || "").replaceAll("\\", "/");
      const newName = String(body.newName || "").trim();
      if (oldRelativePath.toLowerCase() === "manuscript.tex") throw new Error("manuscript.tex 是论文主入口，不能重命名");
      if (!newName || newName === "." || newName === ".." || newName.includes("/") || newName.includes("\\")) throw new Error("请输入有效的新文件名，不能包含路径分隔符");
      const oldFull = safeProjectPath(oldRelativePath);
      const newRelativePath = path.posix.join(path.posix.dirname(oldRelativePath), newName);
      const newFull = safeProjectPath(newRelativePath);
      if (!allowedExtensions.has(path.extname(newFull).toLowerCase())) throw new Error("新文件名必须使用支持的文本扩展名");
      if (fsSync.existsSync(newFull)) throw new Error("同一目录中已经存在这个文件名");
      const stat = await fs.stat(oldFull);
      if (!stat.isFile()) throw new Error("只能重命名文件");
      await fs.rename(oldFull, newFull);
      const updatedReferences = await updateProjectReferences(oldRelativePath, newRelativePath);
      return json(res, 200, { ok: true, path: newRelativePath, updatedReferences });
    }
    if (req.method === "POST" && url.pathname === "/api/synctex") {
      const body = await readJson(req);
      const page = Number(body.page), x = Number(body.x), y = Number(body.y);
      if (!Number.isInteger(page) || page < 1 || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error("无效的 PDF 点击位置");
      const synctex = findCommand("synctex");
      if (!synctex) throw new Error("未检测到 SyncTeX 工具，请重新安装或更新 MiKTeX");
      const result = await runProcess(synctex, ["edit", "-o", `${page}:${x.toFixed(2)}:${y.toFixed(2)}:manuscript.pdf`]);
      if (!result.ok) throw new Error(result.log || "SyncTeX 定位失败");
      const inputMatch = result.log.match(/^Input:(.+)$/m);
      const lineMatch = result.log.match(/^Line:(\d+)$/m);
      if (!inputMatch || !lineMatch) throw new Error("此 PDF 位置没有对应的可编辑 LaTeX 源码");
      const inputPath = inputMatch[1].trim();
      const absoluteInput = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(projectRoot, inputPath);
      if (absoluteInput !== projectRoot && !absoluteInput.startsWith(projectRoot + path.sep)) throw new Error("定位结果不在当前论文项目中");
      const relativeInput = path.relative(projectRoot, absoluteInput).replaceAll(path.sep, "/");
      return json(res, 200, { ok: true, path: relativeInput, line: Math.max(1, Number(lineMatch[1])) });
    }
    if (req.method === "POST" && url.pathname === "/api/compile") return json(res, 200, await compileLatex());
    if (req.method === "POST" && url.pathname === "/api/ai") return json(res, 200, { text: await aiEdit(await readJson(req)) });
    if (req.method === "GET" && url.pathname === "/api/pdf") {
      const pdf = path.join(projectRoot, "manuscript.pdf");
      const stat = await fs.stat(pdf);
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": stat.size, "Cache-Control": "no-store" });
      return fsSync.createReadStream(pdf).pipe(res);
    }
    if (await serveStatic(url.pathname, res)) return;
    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`KNUT 论文编辑器已启动：http://${host}:${port}`);
  console.log(`正在直接编辑：${projectRoot}`);
});
