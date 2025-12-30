Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
projectRoot = shell.CurrentDirectory & "\.."
command = "cmd /c cd /d """ & projectRoot & """ && npm start"
shell.Run command, 0
