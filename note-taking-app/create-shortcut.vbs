Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\My Notes App.lnk")
oShellLink.TargetPath = "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app\Launch-Notes-App.bat"
oShellLink.WorkingDirectory = "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app"
oShellLink.Description = "My Notes App with File System Storage"
oShellLink.Save

WScript.Echo "Desktop shortcut created: My Notes App.lnk"
