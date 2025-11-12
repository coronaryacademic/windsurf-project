Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut("d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app\My Notes App (Silent).lnk")
oShellLink.TargetPath = "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app\Launch-Notes-App-Silent.vbs"
oShellLink.WorkingDirectory = "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app"
oShellLink.Description = "My Notes App - No Command Window"
oShellLink.Save

WScript.Echo "Silent shortcut created in project folder: My Notes App (Silent).lnk"
