# KNUT Thesis Studio

这是一个适用于韩国国立交通大学（KNUT）学位论文的 LaTeX 模板，并附带一个可在 Windows 和 macOS 电脑本地运行的网页论文编辑器。

编辑器会直接读取和修改项目中的真实 `.tex` 文件。保存并编译后，可以在网页右侧立即预览生成的 PDF。论文文件、API Key 和编辑内容默认都保存在本机。

## 主要功能

- LaTeX 语法高亮、行号、自动换行和编辑器配色
- 左侧编辑源码，右侧预览 PDF
- `Ctrl + S` 保存文件并编译 PDF
- 每 2 分钟自动保存
- 页面隐藏、刷新或意外退出时尝试紧急保存
- `Ctrl + /` 添加或取消 LaTeX `%` 注释
- 在文件列表中右键修改文件名
- 点击 PDF 内容，根据 SyncTeX 定位到对应的源码文件和行
- AI 学术润色、扩写、精简、翻译英文和翻译中文

## 一、第一次启动（自动安装）

### Windows

下载完整仓库后，在最外层目录直接双击唯一的入口：

```text
setup-knut-editor.vbs
```

入口会自动检查 Node.js 和 MiKTeX。如果缺少组件，项目会通过 Windows Package Manager（`winget`）自动下载并安装，不需要用户打开软件下载网页。检查或安装结束后，网页编辑器会自动启动。以后也使用同一个入口启动。

安装系统软件时，Windows 可能显示一次管理员权限确认，这是操作系统的安全机制，无法也不应绕过。首次安装期间会显示一个进度窗口；以后正常启动不会显示命令窗口。

`KNUT-Thesis-Files` 文件夹中保存了主论文、README、许可证和内部启动脚本。章节、摘要、图片、网页程序等目录仍保留在项目最外层。正常使用时不要移动或删除这些文件。

自动安装要求：

- Windows 10 1809 或更高版本，或 Windows 11；
- 系统中可以使用 `winget`；
- 电脑可以连接 Node.js 和 MiKTeX 的软件源。

### macOS

下载完整仓库后，在最外层目录双击：

```text
setup-knut-editor-mac.command
```

该入口会自动检查或安装 Homebrew、Node.js、BasicTeX、Biber、韩文/CJK 与模板需要的常用 LaTeX 宏包，然后启动本地服务并打开浏览器。

首次安装可能要求输入 Mac 登录密码。终端输入密码时不会显示字符或圆点，这是 macOS 的正常安全行为，输入完成后按 Return。

如果文件没有执行权限，在项目目录打开“终端”并执行：

```bash
chmod +x setup-knut-editor-mac.command
./setup-knut-editor-mac.command
```

如果 macOS 显示安全拦截，请在 Finder 中按住 Control 点击该文件，选择“打开”，然后再次确认。日常启动仍使用同一个 `.command` 文件；依赖已经安装后不会重复下载。

## 二、手动安装（仅在自动安装失败时）

### 1. 安装 Node.js

从 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本。安装完成后重新打开终端，执行：

```powershell
node --version
```

如果能看到版本号，说明安装成功。本项目的本地编辑器不需要执行 `npm install`。

### 2. 安装 MiKTeX

从 [MiKTeX 官网](https://miktex.org/download) 下载并安装 Windows 版本。推荐使用当前用户安装。

打开 **MiKTeX Console** 后：

1. 进入 `Updates`，点击 `Check for updates`，然后安装全部更新。
2. 进入 `Settings`。
3. 将缺少宏包时自动安装设置为 `Always` 或 `Ask me first`。

编辑器使用 XeLaTeX 编译论文，并会在需要时运行 Biber。

### 3. macOS 手动安装

如果 Mac 自动安装失败，可以先安装 [Homebrew](https://brew.sh/)，再执行：

```bash
brew install node
brew install --cask basictex
export PATH="/Library/TeX/texbin:$PATH"
sudo tlmgr update --self
sudo tlmgr install biber collection-fontsrecommended collection-langcjk collection-latexextra collection-latexrecommended
```

完成后重新运行 `setup-knut-editor-mac.command`。

## 三、启动本地论文编辑器

1. 下载或克隆本项目。
2. 进入项目最外层目录。
3. Windows 双击 `setup-knut-editor.vbs`；macOS 双击 `setup-knut-editor-mac.command`。
4. 稍等几秒，浏览器会自动打开：

```text
http://127.0.0.1:4173
```

首次安装会显示安装进度窗口。依赖已经安装后，入口只进行快速检查并自动打开网页。Windows 内部的 `start-knut-editor.vbs` 可直接启动编辑器，但普通用户不需要操作它。

如果浏览器没有自动打开，可以手动访问上面的地址。关闭启动的后台进程或重启电脑后，本地服务会停止。

## 四、编辑和编译论文

网页打开后：

1. 在左侧文件列表选择一个 `.tex` 或 `.bib` 文件。
2. 在中间编辑区修改内容。
3. 点击右上角 **保存并编译**，或按 `Ctrl + S`。
4. 编译成功后，右侧 PDF 会自动刷新。

仅输入文字不会立即改变右侧 PDF。PDF 是 LaTeX 编译结果，所以必须完成“保存并编译”后才会更新。

### 自动保存

- 编辑器每 2 分钟自动保存一次当前修改。
- 页面切换到后台、刷新或意外退出时，会尝试进行紧急保存。
- 自动保存只保存源文件，不自动编译 PDF。
- 如果关闭网页时仍有未保存内容，浏览器才会显示离开确认。

## 五、常用快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl + S` | 保存当前文件并编译 PDF |
| `Ctrl + /` | 添加或取消当前行/选中行的 LaTeX `%` 注释 |
| `Ctrl + Enter` | 在 AI 自定义要求输入框中提交请求 |

## 六、PDF 与源码定位

编译时项目会生成 SyncTeX 数据。编译成功后，点击右侧 PDF 中的文字或页面位置，编辑器会尝试：

1. 找到对应的 `.tex` 文件；
2. 自动打开该文件；
3. 跳转到对应行并定位光标。

以下情况可能无法准确定位：

- PDF 还没有使用当前编辑器重新编译；
- 点击的是图片、空白区域或扫描内容；
- 当前显示的是项目自带的旧 PDF；
- 编译失败，没有生成最新的 SyncTeX 文件。

遇到这种情况，请先点击一次 **保存并编译**，再重新点击 PDF。

## 七、修改文件名

在左侧文件列表中右键目标文件，然后选择重命名。编辑器会尝试同步更新项目内花括号中的文件引用。

注意：

- `manuscript.tex` 是主入口文件，不能重命名。
- 重命名后应立即保存并编译，检查所有 `\input`、`\include` 和资源路径是否正确。
- 不建议随意更改文件扩展名。

## 八、配置 AI 学术助手

AI 功能需要 OpenAI API Key。ChatGPT 订阅和 API 计费是两个独立服务。

### 1. 获取 API Key

登录 [OpenAI API 平台](https://platform.openai.com/api-keys)，创建一个新的 Secret Key。密钥通常以 `sk-` 开头，只会完整显示一次，请妥善保存。

### 2. 创建本地配置

复制：

```text
local-app/.env.example
```

并将副本命名为：

```text
local-app/.env
```

编辑 `.env`：

```dotenv
OPENAI_API_KEY=sk-你的密钥
OPENAI_MODEL=gpt-5.6-terra
PORT=4173
```

保存后重新启动编辑器。`.env` 已被 Git 忽略，不要把 API Key 提交到 GitHub，也不要截图或发送给其他人。

### 3. 使用 AI

1. 在编辑器中选中需要处理的论文内容。
2. 点击“学术润色”“扩写”“精简”“译为英文”或“译为中文”。
3. 也可以输入自定义要求，然后按 `Ctrl + Enter`。
4. 检查 AI 返回的内容，确认后再应用到论文。

AI 生成内容可能存在事实、引用或格式错误，正式提交论文前必须人工核对。

## 九、论文文件说明

### 编辑器中显示的文件

| 编辑器显示路径 | 文件用途 | 建议修改内容 |
| --- | --- | --- |
| `abstract/abstract-kr.tex` | 论文最后的韩文摘要页面。主文件在参考文献之后载入它。 | 修改韩文论文标题和韩文摘要正文。保留 LaTeX 命令、公式与引用格式。 |
| `abstract/abstract.tex` | 论文前部的英文摘要页面，位于目录之前。 | 修改英文论文标题和英文摘要正文。 |
| `chapters/CH1.tex` | 第一章 **Introduction** 的正文。章节标题由 `manuscript.tex` 统一生成。 | 编写研究背景、问题定义、研究动机和主要贡献；不要在文件开头重复添加 `\chapter`。 |
| `chapters/CH2.tex` | 第二章 **Related Work** 的正文。 | 编写相关研究、理论基础和已有方法比较；文献使用 `\cite{文献键}` 引用。 |
| `chapters/CH3.tex` | 第三章 **Proposed Methodology** 的正文。 | 编写提出的方法、模型结构、算法、公式和实现细节。 |
| `chapters/CH4.tex` | 第四章 **Experiments Evaluation and Analysis** 的正文。 | 编写数据集、实验设置、评价指标、结果表格、对比实验和结果分析。 |
| `chapters/CH5.tex` | 第五章 **Conclusion and Future Work** 的正文。 | 编写研究结论、局限性和未来工作。 |
| `frontmatters/frontmatter.tex` | 独立前置页文档入口，使用不同纸张尺寸组合 `title.tex` 和 `title2.tex`。 | 只有需要单独重新生成 `frontmatter.pdf` 时才编译此文件；当前主论文主要直接使用 `titlePages/` 中的页面。 |
| `frontmatters/title.tex` | 独立前置文档的正面封面。 | 修改论文中英文标题、姓名、学位类型、学校、专业、导师和日期。 |
| `frontmatters/title2.tex` | 独立前置文档的书脊/侧边标题页。 | 修改书脊显示的英文标题、作者姓名和日期；旋转排版代码一般不需要改动。 |
| `manuscript.tex` | 整篇论文的主入口。真实路径是 `KNUT-Thesis-Files/manuscript.tex`，编辑器为简洁起见只显示文件名。 | 配置宏包、页面尺寸、目录、章节标题、章节顺序、参考文献和摘要载入顺序。普通正文应写在对应章节文件中。 |
| `references.bib` | BibLaTeX/Biber 参考文献数据库。真实路径是 `KNUT-Thesis-Files/references.bib`。 | 每篇文献添加一个 BibTeX 条目，并确保条目键与正文中的 `\cite{...}` 一致。 |
| `titlePages/page1_title3.tex` | 主论文载入的第一个标题页，显示学位类型、论文标题、导师、日期、学校、专业和作者。 | 修改页面顶部的基本信息宏；正文主要由第 31 行之后的排版代码生成。 |
| `titlePages/page2_title4.tex` | 主论文载入的第二个标题页，包含论文提交声明。 | 修改标题、提交声明、导师、日期、学校、专业和作者信息。 |
| `titlePages/page3_title5.tex` | 主论文载入的第三个标题页，用于作者提交/学位论文声明信息。 | 修改作者姓名、学位类型、提交日期，以及学校要求的声明文字。 |

### 其他重要目录和文件

| 路径 | 用途 |
| --- | --- |
| `figures/` | 保存论文使用的图片、流程图和实验结果图。建议使用有意义的英文文件名，并通过 `\includegraphics` 引用。 |
| `local-app/` | 本地网页编辑器程序。普通论文写作时不要修改其中的代码。 |
| `KNUT-Thesis-Files/manuscript.pdf` | 最近一次成功编译生成的论文 PDF。编译失败时，右侧可能继续显示这个旧版本。 |
| `setup-knut-editor.vbs` | 最外层的一键安装和启动入口，新用户与日常启动都双击此文件。 |
| `setup-knut-editor-mac.command` | macOS 一键安装和启动入口，支持 Intel 与 Apple 芯片 Mac。 |

### 推荐修改顺序

1. 修改 `titlePages/page1_title3.tex`、`page2_title4.tex` 和 `page3_title5.tex` 中的个人与论文信息。
2. 修改英文摘要 `abstract/abstract.tex` 和韩文摘要 `abstract/abstract-kr.tex`。
3. 按顺序编写 `chapters/CH1.tex` 至 `chapters/CH5.tex`。
4. 将图片放入 `figures/`，将文献条目写入 `references.bib`。
5. 只有需要调整全局格式、章节标题或文件顺序时，才修改 `manuscript.tex`。
6. 按 `Ctrl + S` 保存并编译，检查右侧 PDF。

注意：多个标题页文件分别保存了一份标题、作者和日期宏。修改个人信息时应检查所有标题页，避免不同页面显示不一致。

## 十、常见问题

### 页面显示“尚未安装编译器”

说明编辑器没有找到 XeLaTeX。请确认 MiKTeX 已安装，并在 MiKTeX Console 中完成更新。完成后关闭编辑器并重新启动。

### `latexmk.exe did not succeed` 或提示未检查 MiKTeX 更新

打开 MiKTeX Console，依次执行：

1. `Updates` → `Check for updates`
2. 安装全部更新
3. `Tasks` → `Refresh file name database`
4. `Tasks` → `Refresh font map files`

然后重新启动编辑器并再次编译。

### 左边修改了，右边 PDF 没变化

请按 `Ctrl + S` 或点击 **保存并编译**。自动保存不会自动编译。如果编译失败，右侧会继续显示上一次成功生成的 PDF，请查看页面上的编译错误信息。

### 启动后页面空白或一直显示“正在连接本地项目”

请检查：

- Node.js 是否已正确安装；
- 是否从完整项目目录中启动；
- `4173` 端口是否被其他程序占用；
- 防火墙或安全软件是否阻止了 Node.js；
- 是否已经有另一个编辑器实例在运行。

### 自动安装提示找不到 `winget`

`winget` 由 Microsoft 的“应用安装程序（App Installer）”提供。请先从 Microsoft Store 更新“应用安装程序”，重启电脑后再双击 `setup-knut-editor.vbs`。由于这是 Windows 的系统组件，项目不应从非官方地址替用户下载安装。

### Mac 提示找不到 `brew`、`node` 或 `xelatex`

重新运行 `setup-knut-editor-mac.command`。如果刚安装完 BasicTeX 仍然找不到 `xelatex`，请重启 Mac 后再运行一次。也可以在终端执行：

```bash
export PATH="/Library/TeX/texbin:/opt/homebrew/bin:/usr/local/bin:$PATH"
```

### Mac 提示 LaTeX 宏包缺失

在终端执行：

```bash
sudo tlmgr update --self
sudo tlmgr install biber collection-fontsrecommended collection-langcjk collection-latexextra collection-latexrecommended
```

### 中文或韩文显示异常

本项目使用 XeLaTeX。请确认系统中已安装论文需要的中文、韩文字体，并检查 LaTeX 文件中的字体配置是否与本机字体名称一致。

## 十一、安全说明

- 本地服务默认只监听 `127.0.0.1`，供当前电脑使用。
- Windows 和 macOS 使用同一个本地网页编辑器，论文文件不会因为操作系统不同而上传到外部服务器。
- 不要把 `.env`、API Key 或其他密码提交到 GitHub。
- 提交论文前请备份整个项目，并人工检查 PDF、引用、字体、页码和学校格式要求。

## 许可证

本项目采用 [MIT License](LICENSE)。
