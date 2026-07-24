Option Explicit

Dim shell, fso, rootDir, appDir, url, isRunning, http, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = fso.BuildPath(rootDir, "local-app")
url = "http://127.0.0.1:4173"
isRunning = False

Function CommandExists(commandName)
  Dim result
  On Error Resume Next
  result = (shell.Run(shell.ExpandEnvironmentStrings("%ComSpec%") & " /d /c where " & commandName & " >nul 2>nul", 0, True) = 0)
  If Err.Number <> 0 Then result = False
  Err.Clear
  On Error GoTo 0
  CommandExists = result
End Function

Function MiKTeXExists()
  Dim localPath
  localPath = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\MiKTeX\miktex\bin\x64\xelatex.exe"
  MiKTeXExists = CommandExists("xelatex.exe") Or fso.FileExists(localPath)
End Function

If Not CommandExists("node.exe") Or Not MiKTeXExists() Then
  Dim answer
  answer = MsgBox( _
    "Required components are missing." & vbCrLf & vbCrLf & _
    "KNUT Thesis Studio can automatically install Node.js LTS and MiKTeX." & vbCrLf & _
    "Windows may ask for administrator permission." & vbCrLf & vbCrLf & _
    "Install them now?", _
    vbYesNo + vbQuestion, _
    "KNUT Thesis Studio - First-time setup")

  If answer = vbYes Then
    shell.Run "wscript.exe """ & fso.BuildPath(rootDir, "setup-knut-editor.vbs") & """", 1, False
  End If
  WScript.Quit
End If

On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", url & "/api/files", False
http.Send
If Err.Number = 0 Then
  If http.Status = 200 Then isRunning = True
End If
Err.Clear
On Error GoTo 0

If Not isRunning Then
  shell.CurrentDirectory = appDir
  command = "node.exe """ & fso.BuildPath(appDir, "server.mjs") & """"
  shell.Run command, 0, False

  Dim attempt
  For attempt = 1 To 40
    WScript.Sleep 250
    On Error Resume Next
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", url & "/api/files", False
    http.Send
    If Err.Number = 0 Then
      If http.Status = 200 Then
        isRunning = True
        On Error GoTo 0
        Exit For
      End If
    End If
    Err.Clear
    On Error GoTo 0
  Next
End If

If isRunning Then
  shell.Run url, 1, False
Else
  MsgBox "The local editor could not start. Run setup-knut-editor.vbs and try again.", 16, "KNUT Thesis Studio"
End If
