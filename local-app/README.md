# KNUT 本地论文编辑器

这是 KNUT LaTeX 模板的本地网页编辑器。它只监听 `127.0.0.1`，直接读取和保存上一级项目目录中的论文文件。

## 启动

双击项目根目录中的 `启动论文编辑器.cmd`，然后访问终端中显示的地址。

## 启用 AI

1. 将 `.env.example` 复制为 `.env`。
2. 在 `.env` 中填写 `OPENAI_API_KEY`。
3. 重新启动编辑器。

`.env` 只保存在本机，不应提交到 Git。

## 启用 PDF 自动编译

安装 MiKTeX，并确保安装程序把 LaTeX 命令加入 PATH。重新启动编辑器后，每次保存会自动编译 `manuscript.tex`。如果暂未安装，仍可预览仓库原有的 `manuscript.pdf`。
