import * as pdfjsLib from "/vendor/pdfjs/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.mjs";

const $ = (id) => document.getElementById(id);
const editor = $("editor");
const highlightLayer = $("highlightLayer");
const lineNumbers = $("lineNumbers");
const activeLine = $("activeLine");
let activeFile = "";
let original = "";
let aiSelection = null;
let toastTimer;
let autoSaveInFlight = null;
const AUTO_SAVE_INTERVAL = 120000;
const SUPABASE_URL = "https://prpeqoezuopbdavrdayx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WzWryqw77bddiem0sfVCtw_pr5i3I0W";
const AUTH_STORAGE_KEY = "knut-thesis-auth-session";
const LEGACY_AUTH_STORAGE_KEY = "sb-prpeqoezuopbdavrdayx-auth-token";
const CLOUD_PROJECT = "knut-thesis";
let supabase = null;
let cloudUser = null;
let cloudAccessToken = "";
let cloudSyncInFlight = false;
let productionMode = false;
let softWrap = localStorage.getItem("knut-soft-wrap") !== "false";
let contextFile = "";
let pdfLoadToken = 0;
let paneRatio = Math.min(.75,Math.max(.25,Number(localStorage.getItem("knut-pane-ratio"))||.5));
const colorPresets={
  paper:{text:"#26332d",background:"#ffffff",gutter:"#fafbfa",command:"#6f35b4",comment:"#7d9186",brace:"#d16a16",math:"#b03075",number:"#1b67a5",optional:"#21835e",activeLine:"#f1f8f4"},
  eye:{text:"#33423b",background:"#f7f3e8",gutter:"#efeadc",command:"#6352a5",comment:"#778278",brace:"#b85c28",math:"#9f426d",number:"#25668d",optional:"#37785a",activeLine:"#e9f0df"},
  dark:{text:"#d8e2dc",background:"#17201d",gutter:"#111815",command:"#c39bf3",comment:"#83968b",brace:"#f0a45d",math:"#ef8cbd",number:"#78b8e7",optional:"#75c79f",activeLine:"#22342c"}
};
let editorColors={...colorPresets.paper};

function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600); }
function setCloudStatus(message,type=""){ $("cloudStatus").textContent=message; $("cloudDot").className=`dot ${type}`; }
function reportCloudError(error,context){
  fetch("/api/cloud-diagnostic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    context,
    message:error?.message||String(error),
    code:error?.code||"",
    details:error?.details||"",
    hint:error?.hint||"",
  })}).catch(()=>{});
}
function setCloudBusy(busy){
  cloudSyncInFlight=busy;
  ["uploadProjectBtn","downloadProjectBtn"].forEach(id=>$(id).disabled=busy);
}
function updateAccountView(){
  $("signedOutView").classList.toggle("hidden",!!cloudUser);
  $("signedInView").classList.toggle("hidden",!cloudUser);
  $("accountBtn").textContent=cloudUser?`☁ ${cloudUser.email||"已登录"}`:"☁ 登录 / 同步";
  if(cloudUser)$("accountEmail").textContent=cloudUser.email||cloudUser.id;
}
async function initCloud(){
  try{
    const {createClient}=await import("/vendor/supabase/supabase.mjs");
    if(!localStorage.getItem(AUTH_STORAGE_KEY)&&localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)){
      localStorage.setItem(AUTH_STORAGE_KEY,localStorage.getItem(LEGACY_AUTH_STORAGE_KEY));
    }
    supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{
      storage:window.localStorage,
      storageKey:AUTH_STORAGE_KEY,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
    }});
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    cloudUser=data.session?.user||null;cloudAccessToken=data.session?.access_token||"";updateAccountView();
    if(cloudUser)setCloudStatus("已恢复登录，可同步","ok");
    supabase.auth.onAuthStateChange((_event,session)=>{
      const wasSignedIn=!!cloudUser;
      cloudUser=session?.user||null;cloudAccessToken=session?.access_token||"";updateAccountView();
      if(cloudUser){
        setCloudStatus("已登录，可同步","ok");
        if(!wasSignedIn){loadFiles();reloadPdf();}
      }
    });
  }catch(error){
    console.error("Supabase initialization failed",error);
    $("accountBtn").title="当前无法连接云端，仍可正常使用本地编辑器";
  }
}
async function emailLogin(){
  if(!supabase)return toast("云端服务尚未连接，请检查网络");
  const email=$("emailInput").value.trim(); if(!email)return toast("请输入邮箱地址");
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});
  if(error)return toast(error.message);
  toast("登录链接已发送，请检查邮箱"); setCloudStatus("等待邮箱确认","warn");
}
async function googleLogin(){
  if(!supabase)return toast("云端服务尚未连接，请检查网络");
  const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin}});
  if(error)toast(error.message);
}
async function signOut(){ if(!supabase)return; await supabase.auth.signOut(); cloudUser=null;cloudAccessToken="";updateAccountView();setCloudStatus("已退出登录");activeFile="";original="";editor.value="";syncHighlight(); }
async function cloudUpsertFiles(files,{quiet=false}={}){
  if(!supabase||!cloudUser||!files.length)return false;
  const rows=files.map(file=>({user_id:cloudUser.id,project_id:CLOUD_PROJECT,path:file.path,content:file.content,device_id:localDeviceId()}));
  for(let index=0;index<rows.length;index+=5){
    const {error}=await supabase.from("thesis_files").upsert(rows.slice(index,index+5),{onConflict:"user_id,project_id,path"});
    if(error){
      const detail=error.message||error.details||error.code||"未知错误";
      reportCloudError(error,"upload");
      if(!quiet)toast(`云同步失败：${detail}`);
      setCloudStatus(`上传失败：${detail}`,"error");
      return false;
    }
  }
  setCloudStatus(`已同步 ${files.length} 个文件 · ${new Date().toLocaleTimeString()}`,"ok"); return true;
}
function localDeviceId(){
  let id=localStorage.getItem("knut-device-id");
  if(!id){id=crypto.randomUUID();localStorage.setItem("knut-device-id",id);}
  return id;
}
async function uploadProject(){
  if(!cloudUser)return toast("请先登录");
  if(cloudSyncInFlight)return;
  setCloudBusy(true);setCloudStatus("正在上传本机项目…","warn");
  try{
    await autoSave({silent:true});
    const data=await api("/api/sync/export");
    if(await cloudUpsertFiles(data.files))toast(`已上传 ${data.files.length} 个源文件`);
  }catch(error){const detail=error.message||String(error);reportCloudError(error,"upload-exception");toast(detail);setCloudStatus(`上传失败：${detail}`,"error");}
  finally{setCloudBusy(false);}
}
async function downloadProject(){
  if(!cloudUser)return toast("请先登录");
  if(cloudSyncInFlight)return;
  setCloudBusy(true);setCloudStatus("正在读取云端项目…","warn");
  try{
    const {data,error}=await supabase.from("thesis_files").select("path,content,updated_at").eq("project_id",CLOUD_PROJECT).order("path");
    if(error)throw error;
    if(!data?.length)return toast("云端还没有论文文件，请先在原设备上传");
    if(!window.confirm(`将用云端的 ${data.length} 个文件覆盖本机同名文件，并重新编译 PDF。是否继续？`))return;
    const result=await api("/api/sync/import",{method:"POST",body:JSON.stringify({files:data,compile:true})});
    activeFile="";original="";await loadFiles();handleCompile(result.compile);
    setCloudStatus(`已下载 ${result.imported} 个文件 · ${new Date().toLocaleTimeString()}`,"ok");toast("云端论文已下载到本机");
  }catch(error){toast(`下载失败：${error.message}`);setCloudStatus("下载失败","error");}
  finally{setCloudBusy(false);}
}
async function cloudSaveCurrent(path,content){ if(cloudUser&&!cloudSyncInFlight)await cloudUpsertFiles([{path,content}],{quiet:true}); }
function setStatus(message, type="") { $("status").textContent=message; $("saveDot").className=`dot ${type}`; }
function applyEditorColors(colors,save=true){
  editorColors={...editorColors,...colors}; const root=document.documentElement;
  const variables={text:"--editor-text",background:"--editor-bg",gutter:"--editor-gutter",command:"--editor-command",comment:"--editor-comment",brace:"--editor-brace",math:"--editor-math",number:"--editor-number",optional:"--editor-optional",activeLine:"--editor-active-line"};
  Object.entries(variables).forEach(([key,name])=>root.style.setProperty(name,editorColors[key]));
  document.querySelectorAll("[data-color]").forEach(input=>{if(editorColors[input.dataset.color])input.value=editorColors[input.dataset.color];});
  if(save)localStorage.setItem("knut-editor-colors",JSON.stringify(editorColors));
}
function loadEditorColors(){ try{ const saved=JSON.parse(localStorage.getItem("knut-editor-colors")); applyEditorColors(saved&&typeof saved==="object"?saved:colorPresets.paper,false); }catch{ applyEditorColors(colorPresets.paper,false); } }
function paneAvailableWidth(){
  const workspace=$("workspace"),sidebar=workspace.querySelector(".sidebar"),divider=$("paneDivider");
  return Math.max(0,workspace.clientWidth-sidebar.offsetWidth-divider.offsetWidth-30);
}
function applyPaneRatio(ratio=paneRatio,persist=false){
  if(window.matchMedia("(max-width:1100px)").matches)return;
  const available=paneAvailableWidth(); if(!available)return;
  const minEditor=Math.min(320,available*.45),minPreview=Math.min(360,available*.45);
  const editorWidth=Math.max(minEditor,Math.min(available-minPreview,available*ratio));
  paneRatio=editorWidth/available;
  $("workspace").style.setProperty("--editor-pane",`${editorWidth}px`);
  $("paneDivider").setAttribute("aria-valuenow",String(Math.round(paneRatio*100)));
  if(persist)localStorage.setItem("knut-pane-ratio",String(paneRatio));
  syncHighlight();
}
function setupPaneDivider(){
  const divider=$("paneDivider"),editorPanel=document.querySelector(".editor-panel");
  let dragging=false;
  const finish=()=>{
    if(!dragging)return; dragging=false; divider.classList.remove("dragging"); document.body.classList.remove("resizing-panes");
    localStorage.setItem("knut-pane-ratio",String(paneRatio)); reloadPdf();
  };
  divider.addEventListener("pointerdown",event=>{
    if(event.button!==0)return; dragging=true; divider.classList.add("dragging"); document.body.classList.add("resizing-panes");
    divider.setPointerCapture(event.pointerId); event.preventDefault();
  });
  divider.addEventListener("pointermove",event=>{
    if(!dragging)return; const available=paneAvailableWidth(),left=editorPanel.getBoundingClientRect().left;
    if(available)applyPaneRatio((event.clientX-left)/available);
  });
  divider.addEventListener("pointerup",finish); divider.addEventListener("pointercancel",finish);
  divider.addEventListener("dblclick",()=>{paneRatio=.5;applyPaneRatio(paneRatio,true);reloadPdf();toast("已恢复左右默认比例");});
  divider.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight","Home"].includes(event.key))return; event.preventDefault();
    paneRatio=event.key==="Home"?.5:paneRatio+(event.key==="ArrowLeft"?-.03:.03);
    applyPaneRatio(paneRatio,true); reloadPdf();
  });
  applyPaneRatio();
}
function setDirty() { const dirty=editor.value!==original; $("dirtyBadge").classList.toggle("hidden",!dirty); if(dirty) setStatus("有未保存的修改","warn"); return dirty; }
function escapeHtml(text){ return text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function highlightLatex(text){
  let output="",i=0;
  while(i<text.length){
    const char=text[i];
    if(char==="%"&&(i===0||text[i-1]!=="\\")){ let end=text.indexOf("\n",i); if(end===-1)end=text.length; output+=`<span class="tok-comment">${escapeHtml(text.slice(i,end))}</span>`; i=end; continue; }
    if(char==="\\"){ const match=text.slice(i).match(/^\\(?:[A-Za-z@]+\*?|.)/); const token=match?match[0]:char; output+=`<span class="tok-command">${escapeHtml(token)}</span>`; i+=token.length; continue; }
    if(char==="$" ){ const double=text[i+1]==="$"; const delimiter=double?"$$":"$"; output+=`<span class="tok-math">${delimiter}</span>`; i+=delimiter.length; continue; }
    if(char==="{"||char==="}"){ output+=`<span class="tok-brace">${char}</span>`; i++; continue; }
    if(char==="["||char==="]"){ output+=`<span class="tok-optional">${char}</span>`; i++; continue; }
    if(/\d/.test(char)){ const match=text.slice(i).match(/^\d+(?:\.\d+)?/)[0]; output+=`<span class="tok-number">${match}</span>`; i+=match.length; continue; }
    let end=i+1; while(end<text.length&&!/[\\%${}\[\]\d]/.test(text[end]))end++; output+=escapeHtml(text.slice(i,end)); i=end;
  }
  highlightLayer.innerHTML=output+"\n";
}
function currentLineNumber(){ return editor.value.slice(0,editor.selectionStart).split("\n").length; }
function visualLineCounts(){
  const lines=editor.value.split("\n");
  if(!softWrap)return lines.map(()=>1);
  const style=getComputedStyle(editor),canvas=visualLineCounts.canvas||(visualLineCounts.canvas=document.createElement("canvas")),context=canvas.getContext("2d");
  context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const contentWidth=Math.max(80,editor.clientWidth-88);
  return lines.map(line=>Math.max(1,Math.ceil(context.measureText(line.replaceAll("\t","  ")).width/contentWidth)));
}
function syncEditorChrome(){
  const count=Math.max(1,editor.value.split("\n").length),current=currentLineNumber(),rows=visualLineCounts();
  lineNumbers.innerHTML=Array.from({length:count},(_,index)=>`<span class="${index+1===current?"current":""}" style="height:${rows[index]*22.1}px">${index+1}</span>`).join("");
  lineNumbers.scrollTop=editor.scrollTop;
  activeLine.style.top=`${20+rows.slice(0,current-1).reduce((sum,value)=>sum+value,0)*22.1-editor.scrollTop}px`;
  activeLine.style.height=`${rows[current-1]*22.1}px`;
}
function syncHighlight(){ highlightLatex(editor.value); highlightLayer.scrollTop=editor.scrollTop; highlightLayer.scrollLeft=editor.scrollLeft; syncEditorChrome(); }
async function api(url,options={}){
  const headers={"Content-Type":"application/json",...(cloudAccessToken?{Authorization:`Bearer ${cloudAccessToken}`}:{}),...(options.headers||{})};
  const response=await fetch(url,{...options,headers});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"请求失败");
  return data;
}

function fileIcon(file) { if(file.endsWith(".bib")) return "≡"; if(file.endsWith(".md")) return "◆"; return "T"; }
function displayFileName(file) {
  return file.startsWith("KNUT-Thesis-Files/") ? file.slice("KNUT-Thesis-Files/".length) : file;
}
async function loadFiles() {
  try { const data=await api("/api/files"); $("projectPath").textContent=data.projectRoot; $("projectPath").title=data.projectRoot; const tree=$("fileTree"); tree.innerHTML="";
    data.files.forEach(file=>{ const button=document.createElement("button"); button.className=`file-item${file===activeFile?" active":""}`; button.dataset.file=file; button.title=file; button.innerHTML=`<span class="icon">${fileIcon(file)}</span><span>${displayFileName(file)}</span>`; button.onclick=()=>openFile(file); button.oncontextmenu=event=>showFileContextMenu(event,file); tree.appendChild(button); });
    setStatus("已连接本地项目","ok"); if(!activeFile&&data.files.includes("KNUT-Thesis-Files/manuscript.tex")) openFile("KNUT-Thesis-Files/manuscript.tex");
  } catch(error){ setStatus(error.message,"error"); }
}
function showFileContextMenu(event,file){
  event.preventDefault(); contextFile=file; const menu=$("fileContextMenu");
  menu.classList.remove("hidden"); const width=160,height=46;
  menu.style.left=`${Math.min(event.clientX,window.innerWidth-width-8)}px`; menu.style.top=`${Math.min(event.clientY,window.innerHeight-height-8)}px`;
}
function hideFileContextMenu(){ $("fileContextMenu").classList.add("hidden"); }
async function renameContextFile(){
  hideFileContextMenu(); if(!contextFile)return;
  if(contextFile.toLowerCase()==="knut-thesis-files/manuscript.tex")return toast("manuscript.tex 是主入口，不能重命名");
  if(activeFile===contextFile&&setDirty()&&!(await autoSave({silent:true})))return;
  const currentName=contextFile.split("/").pop(); const newName=window.prompt("请输入新的文件名（请保留扩展名）",currentName);
  if(newName===null||newName.trim()===currentName)return;
  try{
    setStatus("正在重命名文件…","warn"); const oldPath=contextFile;
    const result=await api("/api/rename",{method:"POST",body:JSON.stringify({path:oldPath,newName:newName.trim()})});
    if(activeFile===oldPath){activeFile=result.path;$("activeFile").textContent=displayFileName(result.path);}
    contextFile=""; await loadFiles(); setStatus("文件已重命名","ok");
    const referenceNote=result.updatedReferences?.length?`，并更新 ${result.updatedReferences.length} 个引用文件`:""; toast(`重命名成功${referenceNote}`);
  }catch(error){setStatus("重命名失败","error");toast(error.message);}
}
async function openFile(file) {
  if(setDirty()&&!(await autoSave({silent:true})))return;
  try { setStatus("正在读取…"); const data=await api(`/api/file?path=${encodeURIComponent(file)}`); activeFile=file; original=data.content; editor.value=data.content; syncHighlight(); editor.disabled=false; $("activeFile").textContent=displayFileName(file); document.querySelectorAll(".file-item").forEach(el=>el.classList.toggle("active",el.dataset.file===file)); updateSelection(); setStatus("文件已载入","ok"); }
  catch(error){ toast(error.message); setStatus("读取失败","error"); }
}
async function autoSave({silent=false}={}){
  if(!activeFile||editor.value===original)return true;
  if(autoSaveInFlight)return autoSaveInFlight;
  const fileAtStart=activeFile,contentAtStart=editor.value;
  autoSaveInFlight=(async()=>{
    try{
      if(!silent)setStatus("正在自动保存…","warn");
      await api("/api/autosave",{method:"POST",body:JSON.stringify({path:fileAtStart,content:contentAtStart})});
      await cloudSaveCurrent(fileAtStart,contentAtStart);
      if(activeFile===fileAtStart&&editor.value===contentAtStart){original=contentAtStart;setDirty();setStatus("已自动保存到本地","ok");}
      if(!silent)toast("已自动保存");
      return true;
    }catch(error){setStatus("自动保存失败","error");if(!silent)toast(error.message);return false;}
    finally{autoSaveInFlight=null;}
  })();
  return autoSaveInFlight;
}
function emergencySave(){
  if(!activeFile||editor.value===original)return false;
  const payload=JSON.stringify({path:activeFile,content:editor.value});
  fetch("/api/autosave",{method:"POST",headers:{"Content-Type":"application/json",...(cloudAccessToken?{Authorization:`Bearer ${cloudAccessToken}`}:{})},body:payload,keepalive:true}).catch(()=>{});
  original=editor.value;
  return true;
}
async function saveFile() {
  if(!activeFile) return toast("请先选择文件");
  try { setStatus("正在保存并编译…","warn"); const data=await api("/api/file",{method:"PUT",body:JSON.stringify({path:activeFile,content:editor.value,compile:true})}); original=editor.value; setDirty(); await cloudSaveCurrent(activeFile,editor.value); handleCompile(data.compile); toast(cloudUser?"已保存到本地并同步云端":"已保存到本地文件"); }
  catch(error){ setStatus("保存失败","error"); toast(error.message); }
}
function handleCompile(result) { if(!result) return; if(result.ok){ setStatus("已保存，PDF 编译成功","ok"); reloadPdf(); } else { setStatus(result.missing?"已保存，尚未安装编译器":"已保存，PDF 编译失败",result.missing?"warn":"error"); $("logText").textContent=result.log||"没有编译日志"; $("compileLog").classList.remove("hidden"); } }
async function compileOnly(){ try{ setStatus("正在编译 PDF…","warn"); handleCompile(await api("/api/compile",{method:"POST",body:"{}"})); }catch(error){ toast(error.message); } }
async function reloadPdf(){
  const token=++pdfLoadToken,pages=$("pdfPages"),viewer=$("pdfViewer"),previousScroll=viewer.scrollTop;
  pages.innerHTML='<div class="pdf-loading">正在载入 PDF…</div>';
  try{
    const documentTask=pdfjsLib.getDocument({url:`/api/pdf?t=${Date.now()}`,httpHeaders:cloudAccessToken?{Authorization:`Bearer ${cloudAccessToken}`}:{}}); const pdf=await documentTask.promise;
    if(token!==pdfLoadToken)return; pages.innerHTML="";
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber); if(token!==pdfLoadToken)return;
      const base=page.getViewport({scale:1}),available=Math.max(360,Math.min(920,viewer.clientWidth-70)),scale=available/base.width;
      const viewport=page.getViewport({scale}),pixelRatio=Math.min(window.devicePixelRatio||1,2),renderViewport=page.getViewport({scale:scale*pixelRatio});
      const shell=document.createElement("div"),canvas=document.createElement("canvas"),textLayer=document.createElement("div"),locateSelection=document.createElement("button"),label=document.createElement("span");
      shell.className="pdf-page-shell"; shell.dataset.page=pageNumber; shell.style.width=`${viewport.width}px`; shell.style.height=`${viewport.height}px`;
      shell.style.setProperty("--total-scale-factor",scale); shell.style.setProperty("--scale-round-x","1px"); shell.style.setProperty("--scale-round-y","1px");
      canvas.width=Math.floor(renderViewport.width); canvas.height=Math.floor(renderViewport.height); textLayer.className="textLayer";
      locateSelection.className="pdf-selection-locate hidden"; locateSelection.type="button"; locateSelection.textContent="↗ 定位源码";
      label.className="pdf-page-number"; label.textContent=pageNumber;
      pdfjsLib.setLayerDimensions(textLayer,viewport);
      shell.append(canvas,textLayer,locateSelection,label); pages.appendChild(shell);
      await page.render({canvasContext:canvas.getContext("2d"),viewport:renderViewport}).promise;
      const textContent=await page.getTextContent();
      await new pdfjsLib.TextLayer({textContentSource:textContent,container:textLayer,viewport}).render();
      let pointerStart=null,selectionPoint=null;
      locateSelection.addEventListener("pointerdown",event=>event.stopPropagation());
      locateSelection.addEventListener("click",event=>{
        event.stopPropagation(); if(!selectionPoint)return;
        locatePdfSource(pageNumber,selectionPoint.x,selectionPoint.y,shell,selectionPoint.text,selectionPoint.hint); locateSelection.classList.add("hidden");
      });
      shell.addEventListener("pointerdown",event=>{
        if(event.target.closest(".pdf-selection-locate"))return;
        document.querySelectorAll(".pdf-selection-locate").forEach(button=>button.classList.add("hidden"));
        pointerStart={x:event.clientX,y:event.clientY};
      });
      shell.addEventListener("pointerup",event=>{
        if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<=4)return;
        setTimeout(()=>{
          const selection=window.getSelection(); if(!selection||selection.isCollapsed||!selection.rangeCount)return;
          if(!shell.contains(selection.anchorNode)&&!shell.contains(selection.focusNode))return;
          const shellRect=shell.getBoundingClientRect();
          const rects=[...selection.getRangeAt(0).getClientRects()].filter(rect=>rect.width>0&&rect.height>0&&rect.bottom>=shellRect.top&&rect.top<=shellRect.bottom);
          const rect=rects.at(-1); if(!rect)return;
          const centerX=Math.max(shellRect.left,Math.min(shellRect.right,(rect.left+rect.right)/2));
          const centerY=Math.max(shellRect.top,Math.min(shellRect.bottom,(rect.top+rect.bottom)/2));
          const nearestSpan=[...textLayer.querySelectorAll("span")].map(span=>{
            const spanRect=span.getBoundingClientRect();
            const overlap=Math.max(0,Math.min(rect.right,spanRect.right)-Math.max(rect.left,spanRect.left))*Math.max(0,Math.min(rect.bottom,spanRect.bottom)-Math.max(rect.top,spanRect.top));
            const distance=Math.hypot((spanRect.left+spanRect.right)/2-centerX,(spanRect.top+spanRect.bottom)/2-centerY);
            return {span,score:overlap>0?overlap+100000:-distance};
          }).sort((a,b)=>b.score-a.score)[0]?.span;
          selectionPoint={x:(centerX-shellRect.left)/shellRect.width*base.width,y:(centerY-shellRect.top)/shellRect.height*base.height,text:selection.toString().trim().slice(0,1000),hint:(nearestSpan?.textContent||"").trim().slice(0,500)};
          locateSelection.style.left=`${Math.max(58,Math.min(shellRect.width-58,centerX-shellRect.left))}px`;
          locateSelection.style.top=`${Math.max(18,Math.min(shellRect.height-18,centerY-shellRect.top-28))}px`;
          locateSelection.classList.remove("hidden"); setStatus("已选择 PDF 文字，点击“定位源码”跳转","ok");
        },0);
      });
      shell.addEventListener("click",event=>{
        const moved=pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>4;
        pointerStart=null;
        const selection=window.getSelection();
        if(moved||(selection&&!selection.isCollapsed&&(shell.contains(selection.anchorNode)||shell.contains(selection.focusNode))))return;
        locateSelection.classList.add("hidden");
        const rect=shell.getBoundingClientRect(),pageWidth=base.width,pageHeight=base.height;
        locatePdfSource(pageNumber,(event.clientX-rect.left)/rect.width*pageWidth,(event.clientY-rect.top)/rect.height*pageHeight,shell);
      });
    }
    viewer.scrollTop=Math.min(previousScroll,viewer.scrollHeight-viewer.clientHeight); setStatus("PDF 已载入，可选择文字；单击可定位源码","ok");
  }catch(error){ if(token===pdfLoadToken){pages.innerHTML=`<div class="pdf-loading">PDF 载入失败：${escapeHtml(error.message)}</div>`;setStatus("PDF 载入失败","error");} }
}
async function locatePdfSource(page,x,y,shell,text="",hint=""){
  try{
    setStatus(`正在定位 PDF 第 ${page} 页…`,"warn"); shell.style.outline="3px solid #4aa476";
    const result=await api("/api/synctex",{method:"POST",body:JSON.stringify({page,x,y,text,hint})});
    const methodName=result.method==="macro"?"宏定义定位":result.method==="text"?"文字精确定位":"SyncTeX 定位";
    await openFile(result.path); jumpToSourceLine(result.line); toast(`${methodName}：${result.path} 第 ${result.line} 行`); setStatus("已从 PDF 定位到源码","ok");
  }catch(error){toast(error.message);setStatus("此位置无法定位源码","error");}
  finally{setTimeout(()=>{shell.style.outline="";},700);}
}
function jumpToSourceLine(line){
  const lines=editor.value.split("\n"),target=Math.max(1,Math.min(Number(line)||1,lines.length));
  let index=0; for(let current=1;current<target;current++)index+=lines[current-1].length+1;
  editor.setSelectionRange(index,index); editor.focus(); syncHighlight();
  const rows=visualLineCounts(),top=rows.slice(0,target-1).reduce((sum,value)=>sum+value,0)*22.1;
  editor.scrollTop=Math.max(0,top-editor.clientHeight/3); syncHighlight();
  const container=editor.closest(".code-editor"); container.classList.remove("source-located"); void container.offsetWidth; container.classList.add("source-located");
}
function updateSelection(){ const count=Math.max(0,editor.selectionEnd-editor.selectionStart); $("selectionCount").textContent=`${count} 字`; }
function toggleComment(){
  if(!activeFile)return toast("请先选择文件");
  const value=editor.value,start=editor.selectionStart,end=editor.selectionEnd;
  const effectiveEnd=end>start&&value[end-1]==="\n"?end-1:end;
  const lineStart=value.lastIndexOf("\n",start-1)+1;
  const nextBreak=value.indexOf("\n",effectiveEnd);
  const lineEnd=nextBreak===-1?value.length:nextBreak;
  const block=value.slice(lineStart,lineEnd),lines=block.split("\n");
  const allCommented=lines.filter(line=>line.trim()).every(line=>/^\s*%/.test(line));
  const transformed=lines.map(line=>{
    if(!line.trim())return line;
    if(allCommented)return line.replace(/^(\s*)% ?/,"$1");
    return line.replace(/^(\s*)/,"$1% ");
  }).join("\n");
  editor.setRangeText(transformed,lineStart,lineEnd,"select");
  if(start===end){
    const delta=transformed.length-block.length;
    const position=Math.max(lineStart,Math.min(lineStart+transformed.length,start+delta));
    editor.setSelectionRange(position,position);
  }
  syncHighlight();setDirty();updateSelection();editor.focus();
}
function applySoftWrap(){
  const container=editor.closest(".code-editor");
  container.classList.toggle("wrap-off",!softWrap); editor.wrap=softWrap?"soft":"off";
  $("wrapBtn").classList.toggle("active",softWrap); $("wrapBtn").textContent=softWrap?"↵ 自动换行":"↔ 横向滚动";
  localStorage.setItem("knut-soft-wrap",String(softWrap)); syncHighlight();
}
async function runAi(action,instruction=""){
  if(!activeFile) return toast("请先选择文件"); const start=editor.selectionStart,end=editor.selectionEnd,text=editor.value.slice(start,end); if(!text.trim()) return toast("请先在正文中选择需要处理的文字");
  aiSelection={start,end}; try{ setStatus("AI 正在处理选中文字…","warn"); document.querySelectorAll(".ai-actions button").forEach(b=>b.disabled=true); $("sendAiPrompt").disabled=true; $("aiPrompt").disabled=true; const data=await api("/api/ai",{method:"POST",body:JSON.stringify({action,text,file:activeFile,instruction})}); $("aiResult").value=data.text; $("aiReview").classList.remove("hidden"); setStatus("AI 建议已生成，请检查","ok"); }
  catch(error){ toast(error.message); setStatus("AI 请求未完成","error"); }
  finally{ document.querySelectorAll(".ai-actions button").forEach(b=>b.disabled=false); $("sendAiPrompt").disabled=false; $("aiPrompt").disabled=false; }
}
function runCustomAi(){ const instruction=$("aiPrompt").value.trim(); if(!instruction)return toast("请先输入希望 AI 执行的修改要求"); runAi("custom",instruction); }
function applyAi(){ if(!aiSelection)return; editor.setRangeText($("aiResult").value,aiSelection.start,aiSelection.end,"end"); syncHighlight(); $("aiReview").classList.add("hidden"); aiSelection=null; setDirty(); toast("AI 建议已应用，尚未保存"); }

editor.addEventListener("input",()=>{setDirty();syncHighlight();}); editor.addEventListener("scroll",syncHighlight); editor.addEventListener("select",()=>{updateSelection();syncEditorChrome();}); editor.addEventListener("click",syncEditorChrome); editor.addEventListener("keyup",()=>{updateSelection();syncEditorChrome();});
document.addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveFile();return;} if((e.ctrlKey||e.metaKey)&&(e.key==="/"||e.code==="Slash")){e.preventDefault();toggleComment();} });
$("saveBtn").onclick=saveFile; $("compileBtn").onclick=compileOnly; $("refreshBtn").onclick=loadFiles; $("reloadPdf").onclick=reloadPdf; $("closeLog").onclick=()=>$("compileLog").classList.add("hidden");
$("wrapBtn").onclick=()=>{softWrap=!softWrap;applySoftWrap();};
$("commentBtn").onclick=toggleComment;
$("renameFileBtn").onclick=renameContextFile;
$("colorSettingsBtn").onclick=()=>$("colorPanel").classList.toggle("hidden"); $("closeColorPanel").onclick=()=>$("colorPanel").classList.add("hidden");
document.querySelectorAll("[data-preset]").forEach(button=>button.onclick=()=>{applyEditorColors(colorPresets[button.dataset.preset]);toast("编辑器配色已更新");});
document.querySelectorAll("[data-color]").forEach(input=>input.oninput=()=>applyEditorColors({[input.dataset.color]:input.value}));
$("resetColors").onclick=()=>{applyEditorColors(colorPresets.paper);toast("已恢复默认配色");};
document.addEventListener("click",event=>{if(!$("colorPanel").classList.contains("hidden")&&!$("colorPanel").contains(event.target)&&!$("colorSettingsBtn").contains(event.target))$("colorPanel").classList.add("hidden");});
document.addEventListener("click",event=>{if(!$("fileContextMenu").contains(event.target))hideFileContextMenu();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")hideFileContextMenu();});
window.addEventListener("scroll",hideFileContextMenu,true);
$("cancelAi").onclick=()=>{$("aiReview").classList.add("hidden");aiSelection=null;}; $("applyAi").onclick=applyAi; document.querySelectorAll(".ai-actions button").forEach(button=>button.onclick=()=>runAi(button.dataset.action));
$("sendAiPrompt").onclick=runCustomAi; $("aiPrompt").addEventListener("keydown",event=>{if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)){event.preventDefault();runCustomAi();}});
$("accountBtn").onclick=()=>$("accountModal").classList.remove("hidden");
$("closeAccountModal").onclick=()=>$("accountModal").classList.add("hidden");
$("accountModal").addEventListener("click",event=>{if(event.target===$("accountModal"))$("accountModal").classList.add("hidden");});
$("emailLoginBtn").onclick=emailLogin;$("googleLoginBtn").onclick=googleLogin;$("signOutBtn").onclick=signOut;
$("uploadProjectBtn").onclick=uploadProject;$("downloadProjectBtn").onclick=downloadProject;
setInterval(()=>autoSave(),AUTO_SAVE_INTERVAL);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")emergencySave();});
window.addEventListener("pagehide",emergencySave);
window.addEventListener("beforeunload",e=>{if(editor.value!==original){emergencySave();e.preventDefault();e.returnValue="";}});
window.addEventListener("resize",()=>{applyPaneRatio();syncHighlight();});
async function boot(){
  loadEditorColors();applySoftWrap();setupPaneDivider();
  try{
    const response=await fetch("/api/config",{cache:"no-store"});
    if(response.ok)productionMode=(await response.json()).mode==="production";
  }catch{}
  await initCloud();
  if(!productionMode||cloudUser){reloadPdf();loadFiles();}
  else{setStatus("请登录后打开论文项目","warn");$("pdfPages").innerHTML='<div class="pdf-loading">请先登录以载入个人论文 PDF</div>';}
}
boot();
