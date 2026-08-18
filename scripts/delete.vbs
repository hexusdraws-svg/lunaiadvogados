Set fso = CreateObject("Scripting.FileSystemObject")
On Error Resume Next
fso.DeleteFile "C:\Users\the exceed\Documents\lunaiadvocacia\src\routes\processos_.$id.tsx", True
If Err.Number = 0 Then
    WScript.Echo "Deleted successfully"
Else
    WScript.Echo "Error: " & Err.Description
End If