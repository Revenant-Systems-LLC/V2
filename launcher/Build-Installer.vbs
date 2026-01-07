Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
projectRoot = shell.CurrentDirectory & "\.."
command = "cmd /c cd /d """ & projectRoot & """ && launcher\\Build-Installer.bat"
shell.Run command, 0
