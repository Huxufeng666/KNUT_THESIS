Option Explicit

Dim shell, fso, rootDir, projectDir, scriptPath, startPath, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.BuildPath(rootDir, "KNUT-Thesis-Studio")
scriptPath = fso.BuildPath(projectDir, "setup-knut-editor.ps1")
startPath = fso.BuildPath(projectDir, "start-knut-editor.vbs")

If Not fso.FolderExists(projectDir) Then
  MsgBox "The application folder is missing: " & projectDir, 16, "KNUT Thesis Studio"
  WScript.Quit 1
End If

If Not fso.FileExists(scriptPath) Or Not fso.FileExists(startPath) Then
  MsgBox "The application files are incomplete. Please download the complete repository again.", 16, "KNUT Thesis Studio"
  WScript.Quit 1
End If

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"
exitCode = shell.Run(command, 1, True)

If exitCode = 0 Then
  shell.Run "wscript.exe """ & startPath & """", 1, False
End If
