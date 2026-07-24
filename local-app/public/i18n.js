(() => {
  const STORAGE_KEY = "knut-ui-language";
  const supported = new Set(["zh", "en", "ko"]);
  const translations = {
    en: {
      "本地论文工作台":"Local thesis workspace","正在连接本地项目…":"Connecting to thesis project…","☁ 登录 / 同步":"☁ Sign in / Sync",
      "◐ 编辑器配色":"◐ Editor colors","编译 PDF":"Compile PDF","保存并编译":"Save & compile","☰ 文件":"☰ Files","✎ 编辑":"✎ Editor",
      "手机页面切换":"Mobile workspace navigation","编辑器配色设置":"Editor color settings","编辑器配色":"Editor colors","选择预设或单独调整颜色":"Choose a preset or customize colors",
      "关闭配色设置":"Close color settings","明亮":"Light","护眼":"Comfort","深色":"Dark","普通文字":"Plain text","编辑背景":"Editor background",
      "LaTeX 命令":"LaTeX commands","注释":"Comments","花括号":"Braces","可选参数":"Optional arguments","数学符号":"Math symbols","数字":"Numbers",
      "当前行":"Current line","恢复默认":"Restore defaults","设置自动保存在本机":"Saved automatically on this device","论文结构":"Thesis files","刷新文件":"Refresh files",
      "本机文件":"Local files","这里的保存会直接写入你的 LaTeX 项目。":"Changes are written directly to your LaTeX project.","选择一个文件":"Select a file",
      "未保存":"Unsaved","0 字":"0 chars","↵ 自动换行":"↵ Word wrap","切换长行自动换行":"Toggle word wrap","% 注释":"% Comment",
      "切换 LaTeX 行注释":"Toggle LaTeX line comments","欢迎使用 KNUT Thesis Studio":"Welcome to KNUT Thesis Studio",
      "登录后会自动创建一份独立的 KNUT 论文模板，你可以直接编辑、保存并编译 PDF。":"After signing in, your own KNUT thesis template is created automatically for editing, saving, and PDF compilation.",
      "1. 登录账号":"1. Sign in","2. 编辑模板":"2. Edit template","3. 保存并编译":"3. Save & compile","登录并开始写作":"Sign in and start writing",
      "LaTeX 编辑器":"LaTeX editor","请从左侧选择一个文件…":"Select a file from the left…","AI 学术助手":"AI academic assistant",
      "先选中文字，再选择操作":"Select text, then choose an action","学术润色":"Academic polish","扩写":"Expand","精简":"Shorten","译为英文":"Translate to English",
      "译为中文":"Translate to Chinese","直接告诉 AI 如何修改选中文字，例如：加强论证逻辑并保持 LaTeX 引用":"Tell AI how to revise the selection, e.g. strengthen the argument while preserving LaTeX citations",
      "自定义 AI 修改要求":"Custom AI instruction","发送":"Send","AI 修改建议":"AI revision","请检查后再替换":"Review before replacing",
      "AI 修改结果":"AI result","取消":"Cancel","替换选中文字":"Replace selected text","调整编辑器和 PDF 预览宽度":"Resize editor and PDF preview",
      "拖动调整左右宽度，双击恢复默认":"Drag to resize; double-click to reset","PDF 预览":"PDF preview","刷新预览":"Refresh preview","论文 PDF 预览":"Thesis PDF preview",
      "正在载入 PDF…":"Loading PDF…","编译信息":"Compilation details","重命名文件":"Rename file","账号与云同步":"Account & cloud sync",
      "同一账号可在不同设备同步论文源文件":"Sync thesis source files across devices with one account","关闭":"Close",
      "推荐使用邮箱登录，不依赖 Google 服务。":"Email sign-in is recommended and does not depend on Google services.","邮箱地址":"Email address","发送登录链接":"Send sign-in link",
      "或":"or","使用 Google 登录（备用）":"Sign in with Google (backup)",
      "邮箱登录无需密码，请在收到的邮件中点击登录链接。Google 登录在部分网络环境下可能不可用。":"Email sign-in requires no password; open the link sent to your inbox. Google sign-in may be unavailable on some networks.",
      "当前账号":"Current account","退出登录":"Sign out","当前论文项目":"Current thesis project","共享管理":"Sharing","共享成员":"Members",
      "含所有者最多 6 人":"Up to 6 people including the owner","成员邮箱":"Member email","可编辑":"Can edit","只读":"View only","添加":"Add",
      "分享论文链接":"Share thesis link","尚未同步":"Not synced","上传本机项目":"Upload local project","下载云端项目":"Download cloud project",
      "本机保存后会自动上传当前文件。首次换设备时，请先使用“下载云端项目”。下载会覆盖本机同名源文件，并自动重新编译 PDF。":"After a local save, the current file is uploaded automatically. On a new device, download the cloud project first. Downloading replaces same-named local source files and recompiles the PDF.",
      "已登录":"Signed in","等待登录":"Awaiting sign-in","已加入":"Joined","所有者":"Owner","移除":"Remove","权限已更新":"Permission updated",
      "文件已载入":"File loaded","读取失败":"Load failed","正在读取…":"Loading…","有未保存的修改":"Unsaved changes","正在自动保存…":"Autosaving…",
      "已自动保存到本地":"Autosaved locally","已自动保存":"Autosaved","自动保存失败":"Autosave failed","正在保存并编译…":"Saving and compiling…",
      "保存失败":"Save failed","已保存，PDF 编译成功":"Saved; PDF compiled successfully","已保存，PDF 编译失败":"Saved; PDF compilation failed",
      "已保存，尚未安装编译器":"Saved; compiler not installed","没有编译日志":"No compilation log","正在编译 PDF…":"Compiling PDF…",
      "↗ 定位源码":"↗ Locate source","已选择 PDF 文字，点击“定位源码”跳转":"PDF text selected; choose “Locate source” to jump",
      "PDF 已载入，可选择文字；单击可定位源码":"PDF loaded. Select text or click to locate source.","PDF 载入失败":"PDF failed to load",
      "已从 PDF 定位到源码":"Located source from PDF","此位置无法定位源码":"No source found at this position","当前是只读权限，不能修改":"View-only access cannot make changes",
      "请先选择文件":"Select a file first","↔ 横向滚动":"↔ Horizontal scroll","当前是只读权限，不能使用 AI":"AI is unavailable with view-only access",
      "请先在正文中选择需要处理的文字":"Select text in the editor first","AI 正在处理选中文字…":"AI is processing the selection…",
      "AI 建议已生成，请检查":"AI suggestion ready for review","AI 请求未完成":"AI request failed","请先输入希望 AI 执行的修改要求":"Enter an instruction for AI first",
      "AI 建议已应用，尚未保存":"AI suggestion applied; not saved","编辑器配色已更新":"Editor colors updated","已恢复默认配色":"Default colors restored",
      "游客只读模板 · 登录后可编辑":"Guest template · Sign in to edit","已连接个人项目":"Personal project connected","共享项目 · 只读权限":"Shared project · View only"
    },
    ko: {
      "本地论文工作台":"로컬 논문 작업 공간","正在连接本地项目…":"논문 프로젝트 연결 중…","☁ 登录 / 同步":"☁ 로그인 / 동기화",
      "◐ 编辑器配色":"◐ 편집기 색상","编译 PDF":"PDF 컴파일","保存并编译":"저장 및 컴파일","☰ 文件":"☰ 파일","✎ 编辑":"✎ 편집",
      "手机页面切换":"모바일 작업 화면 전환","编辑器配色设置":"편집기 색상 설정","编辑器配色":"편집기 색상","选择预设或单独调整颜色":"프리셋 선택 또는 색상 사용자 지정",
      "关闭配色设置":"색상 설정 닫기","明亮":"밝게","护眼":"눈 보호","深色":"어둡게","普通文字":"일반 텍스트","编辑背景":"편집 배경",
      "LaTeX 命令":"LaTeX 명령","注释":"주석","花括号":"중괄호","可选参数":"선택 인수","数学符号":"수학 기호","数字":"숫자",
      "当前行":"현재 줄","恢复默认":"기본값 복원","设置自动保存在本机":"이 기기에 자동 저장","论文结构":"논문 파일","刷新文件":"파일 새로고침",
      "本机文件":"로컬 파일","这里的保存会直接写入你的 LaTeX 项目。":"저장 내용은 LaTeX 프로젝트에 직접 기록됩니다.","选择一个文件":"파일 선택",
      "未保存":"저장 안 됨","0 字":"0자","↵ 自动换行":"↵ 자동 줄바꿈","切换长行自动换行":"긴 줄 자동 줄바꿈 전환","% 注释":"% 주석",
      "切换 LaTeX 行注释":"LaTeX 줄 주석 전환","欢迎使用 KNUT Thesis Studio":"KNUT Thesis Studio에 오신 것을 환영합니다",
      "登录后会自动创建一份独立的 KNUT 论文模板，你可以直接编辑、保存并编译 PDF。":"로그인하면 개인 KNUT 논문 템플릿이 자동 생성되며 편집, 저장 및 PDF 컴파일을 할 수 있습니다.",
      "1. 登录账号":"1. 로그인","2. 编辑模板":"2. 템플릿 편집","3. 保存并编译":"3. 저장 및 컴파일","登录并开始写作":"로그인하고 작성 시작",
      "LaTeX 编辑器":"LaTeX 편집기","请从左侧选择一个文件…":"왼쪽에서 파일을 선택하세요…","AI 学术助手":"AI 학술 도우미",
      "先选中文字，再选择操作":"텍스트를 선택한 후 작업을 고르세요","学术润色":"학술 문장 다듬기","扩写":"확장","精简":"간결하게","译为英文":"영어로 번역",
      "译为中文":"중국어로 번역","直接告诉 AI 如何修改选中文字，例如：加强论证逻辑并保持 LaTeX 引用":"선택한 텍스트의 수정 방법을 AI에게 입력하세요. 예: LaTeX 인용을 유지하며 논리를 강화",
      "自定义 AI 修改要求":"사용자 지정 AI 수정 요청","发送":"전송","AI 修改建议":"AI 수정 제안","请检查后再替换":"교체 전에 검토하세요",
      "AI 修改结果":"AI 수정 결과","取消":"취소","替换选中文字":"선택 텍스트 교체","调整编辑器和 PDF 预览宽度":"편집기와 PDF 미리보기 너비 조정",
      "拖动调整左右宽度，双击恢复默认":"드래그하여 너비 조정, 두 번 클릭하여 초기화","PDF 预览":"PDF 미리보기","刷新预览":"미리보기 새로고침","论文 PDF 预览":"논문 PDF 미리보기",
      "正在载入 PDF…":"PDF 불러오는 중…","编译信息":"컴파일 정보","重命名文件":"파일 이름 변경","账号与云同步":"계정 및 클라우드 동기화",
      "同一账号可在不同设备同步论文源文件":"같은 계정으로 여러 기기에서 논문 소스 동기화","关闭":"닫기",
      "推荐使用邮箱登录，不依赖 Google 服务。":"Google 서비스에 의존하지 않는 이메일 로그인을 권장합니다.","邮箱地址":"이메일 주소","发送登录链接":"로그인 링크 전송",
      "或":"또는","使用 Google 登录（备用）":"Google로 로그인(보조)",
      "邮箱登录无需密码，请在收到的邮件中点击登录链接。Google 登录在部分网络环境下可能不可用。":"이메일 로그인은 비밀번호가 필요 없습니다. 받은 메일의 링크를 누르세요. 일부 네트워크에서는 Google 로그인이 제한될 수 있습니다.",
      "当前账号":"현재 계정","退出登录":"로그아웃","当前论文项目":"현재 논문 프로젝트","共享管理":"공유 관리","共享成员":"공유 구성원",
      "含所有者最多 6 人":"소유자 포함 최대 6명","成员邮箱":"구성원 이메일","可编辑":"편집 가능","只读":"읽기 전용","添加":"추가",
      "分享论文链接":"논문 링크 공유","尚未同步":"동기화 안 됨","上传本机项目":"로컬 프로젝트 업로드","下载云端项目":"클라우드 프로젝트 다운로드",
      "本机保存后会自动上传当前文件。首次换设备时，请先使用“下载云端项目”。下载会覆盖本机同名源文件，并自动重新编译 PDF。":"로컬 저장 후 현재 파일이 자동 업로드됩니다. 새 기기에서는 먼저 클라우드 프로젝트를 다운로드하세요. 같은 이름의 로컬 파일을 덮어쓰고 PDF를 다시 컴파일합니다.",
      "已登录":"로그인됨","等待登录":"로그인 대기","已加入":"참여 중","所有者":"소유자","移除":"삭제","权限已更新":"권한이 업데이트되었습니다",
      "文件已载入":"파일을 불러왔습니다","读取失败":"불러오기 실패","正在读取…":"불러오는 중…","有未保存的修改":"저장하지 않은 변경 사항","正在自动保存…":"자동 저장 중…",
      "已自动保存到本地":"로컬에 자동 저장됨","已自动保存":"자동 저장됨","自动保存失败":"자동 저장 실패","正在保存并编译…":"저장 및 컴파일 중…",
      "保存失败":"저장 실패","已保存，PDF 编译成功":"저장 완료, PDF 컴파일 성공","已保存，PDF 编译失败":"저장 완료, PDF 컴파일 실패",
      "已保存，尚未安装编译器":"저장 완료, 컴파일러가 설치되지 않음","没有编译日志":"컴파일 로그 없음","正在编译 PDF…":"PDF 컴파일 중…",
      "↗ 定位源码":"↗ 소스 위치 찾기","已选择 PDF 文字，点击“定位源码”跳转":"PDF 텍스트 선택됨. ‘소스 위치 찾기’를 눌러 이동",
      "PDF 已载入，可选择文字；单击可定位源码":"PDF 로드 완료. 텍스트를 선택하거나 클릭하여 소스 위치 찾기","PDF 载入失败":"PDF 로드 실패",
      "已从 PDF 定位到源码":"PDF에서 소스 위치를 찾았습니다","此位置无法定位源码":"이 위치의 소스를 찾을 수 없습니다","当前是只读权限，不能修改":"읽기 전용 권한에서는 수정할 수 없습니다",
      "请先选择文件":"먼저 파일을 선택하세요","↔ 横向滚动":"↔ 가로 스크롤","当前是只读权限，不能使用 AI":"읽기 전용 권한에서는 AI를 사용할 수 없습니다",
      "请先在正文中选择需要处理的文字":"편집기에서 처리할 텍스트를 먼저 선택하세요","AI 正在处理选中文字…":"AI가 선택 텍스트를 처리 중…",
      "AI 建议已生成，请检查":"AI 제안이 생성되었습니다. 검토하세요","AI 请求未完成":"AI 요청 실패","请先输入希望 AI 执行的修改要求":"AI 수정 요청을 먼저 입력하세요",
      "AI 建议已应用，尚未保存":"AI 제안 적용됨, 아직 저장되지 않음","编辑器配色已更新":"편집기 색상이 업데이트되었습니다","已恢复默认配色":"기본 색상으로 복원했습니다",
      "游客只读模板 · 登录后可编辑":"게스트 읽기 전용 템플릿 · 로그인 후 편집","已连接个人项目":"개인 프로젝트 연결됨","共享项目 · 只读权限":"공유 프로젝트 · 읽기 전용"
    }
  };

  const textOriginal = new WeakMap();
  const attrOriginal = new WeakMap();
  const translatableAttrs = ["title", "placeholder", "aria-label"];
  let current = supported.has(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : (navigator.language.toLowerCase().startsWith("ko") ? "ko" : navigator.language.toLowerCase().startsWith("en") ? "en" : "zh");

  function dynamic(text, lang) {
    if (lang === "zh") return text;
    const rules = lang === "ko" ? [
      [/^(\d+) 字$/, "$1자"], [/^正在定位 PDF 第 (\d+) 页…$/, "PDF $1페이지 위치 찾는 중…"],
      [/^已上传 (\d+) 个源文件$/, "소스 파일 $1개 업로드됨"], [/^已下载 (\d+) 个文件.*$/, "파일 $1개 다운로드됨"],
      [/^PDF 载入失败：(.+)$/, "PDF 로드 실패: $1"], [/^正在定位 PDF 第 (\d+) 页…$/, "PDF $1페이지 위치 찾는 중…"]
    ] : [
      [/^(\d+) 字$/, "$1 chars"], [/^正在定位 PDF 第 (\d+) 页…$/, "Locating PDF page $1…"],
      [/^已上传 (\d+) 个源文件$/, "Uploaded $1 source files"], [/^已下载 (\d+) 个文件.*$/, "Downloaded $1 files"],
      [/^PDF 载入失败：(.+)$/, "PDF failed to load: $1"]
    ];
    for (const [pattern, replacement] of rules) if (pattern.test(text)) return text.replace(pattern, replacement);
    return translations[lang]?.[text] || text;
  }

  function translateTextNode(node) {
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const recognized = translations.en[trimmed] || translations.ko[trimmed] || /[\u3400-\u9fff]/u.test(trimmed);
    if (recognized) textOriginal.set(node, trimmed);
    const original = textOriginal.get(node) || trimmed;
    const translated = dynamic(original, current);
    const next = raw.replace(trimmed, translated);
    if (next !== raw) node.nodeValue = next;
  }

  function translateElement(element) {
    let originals = attrOriginal.get(element);
    if (!originals) { originals = {}; attrOriginal.set(element, originals); }
    for (const attr of translatableAttrs) {
      if (!element.hasAttribute(attr)) continue;
      const value = element.getAttribute(attr);
      if (translations.en[value] || translations.ko[value] || /[\u3400-\u9fff]/u.test(value)) originals[attr] = value;
      const original = originals[attr] || value;
      const translated = dynamic(original, current);
      if (translated !== value) element.setAttribute(attr, translated);
    }
  }

  function translateTree(root = document.body) {
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root);
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) walker.currentNode.nodeType === Node.TEXT_NODE ? translateTextNode(walker.currentNode) : translateElement(walker.currentNode);
    document.documentElement.lang = current === "zh" ? "zh-CN" : current;
    const selector = document.getElementById("languageSelect");
    if (selector) selector.value = current;
  }

  function setLanguage(language) {
    if (!supported.has(language)) return;
    current = language;
    localStorage.setItem(STORAGE_KEY, language);
    translateTree();
    window.dispatchEvent(new CustomEvent("knut-language-change", { detail: { language } }));
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateTextNode(mutation.target);
      for (const node of mutation.addedNodes) translateTree(node);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.getElementById("languageSelect")?.addEventListener("change", event => setLanguage(event.target.value));
  translateTree();
  window.knutI18n = { setLanguage, getLanguage: () => current, translate: text => dynamic(text, current), translateTree };
})();
