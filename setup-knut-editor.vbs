Option Explicit

Dim shell, fso, rootDir, scriptPath, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(rootDir, "setup-knut-editor.ps1")

If Not fso.FileExists(scriptPath) Then
  MsgBox "The setup script is missing: " & scriptPath, 16, "KNUT Thesis Studio"
  WScript.Quit 1
End If

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"
exitCode = shell.Run(command, 1, True)

If exitCode = 0 Then
  shell.Run "wscript.exe """ & fso.BuildPath(rootDir, "start-knut-editor.vbs") & """", 1, False
End If
