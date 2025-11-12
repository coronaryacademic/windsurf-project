Set WshShell = CreateObject("WScript.Shell")

' Change to the electron directory and run npm start silently
WshShell.CurrentDirectory = "d:\My projects\Note taking app\CascadeProjects\windsurf-project\note-taking-app\electron"

' Run npm start without showing command window (0 = hidden, False = don't wait)
WshShell.Run "npm start", 0, False
