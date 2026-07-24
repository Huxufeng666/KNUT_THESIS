Option Explicit

Dim shell, fso, rootDir, appDir, url, isRunning, http, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = fso.BuildPath(rootDir, "local-app")
url = "http://127.0.0.1:4173"
isRunning = False

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
  For attempt = 1 To 20
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
  MsgBox "The local editor could not start. Please make sure Node.js is installed.", 16, "KNUT Thesis Studio"
End If
