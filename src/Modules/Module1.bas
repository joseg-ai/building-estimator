Attribute VB_Name = "Module1"
'QUITAR CONTRASEÑA A WORKSHEET

Sub Quitar_contraseña()
Dim a As Integer, b As Integer, c As Integer
Dim d As Integer, e As Integer, f As Integer
Dim a1 As Integer, a2 As Integer, a3 As Integer
Dim a4 As Integer, a5 As Integer, a6 As Integer
On Error Resume Next
For a = 65 To 66: For b = 65 To 66: For c = 65 To 66
For d = 65 To 66: For e = 65 To 66: For a1 = 65 To 66
For a2 = 65 To 66: For a3 = 65 To 66: For a4 = 65 To 66
For a5 = 65 To 66: For a6 = 65 To 66: For f = 32 To 126
Contraseña = Chr(a) & Chr(b) & Chr(c) & Chr(d) & Chr(e) & Chr(a1) _
& Chr(a2) & Chr(a3) & Chr(a4) & Chr(a5) & Chr(a6) & Chr(f)
ActiveSheet.Unprotect Contraseña
If ActiveSheet.ProtectContents = False Then
MsgBox "¡Enorabuena!" & vbCr & "Se ha quitado la contraseña:" & vbCr & Contraseña
Exit Sub
End If
Next: Next: Next: Next: Next: Next
Next: Next: Next: Next: Next: Next
End Sub


'QUITAR CONTRASEÑA A WORKBOOK

Sub Quitar_contraseña2()
Dim a As Integer, b As Integer, c As Integer
Dim d As Integer, e As Integer, f As Integer
Dim a1 As Integer, a2 As Integer, a3 As Integer
Dim a4 As Integer, a5 As Integer, a6 As Integer
On Error Resume Next
For a = 65 To 66: For b = 65 To 66: For c = 65 To 66
For d = 65 To 66: For e = 65 To 66: For a1 = 65 To 66
For a2 = 65 To 66: For a3 = 65 To 66: For a4 = 65 To 66
For a5 = 65 To 66: For a6 = 65 To 66: For f = 32 To 126
Contraseña = Chr(a) & Chr(b) & Chr(c) & Chr(d) & Chr(e) & Chr(a1) _
& Chr(a2) & Chr(a3) & Chr(a4) & Chr(a5) & Chr(a6) & Chr(f)
ActiveWorkbook.Unprotect Contraseña
If ActiveWorkbook.ProtectStructure = False Then
MsgBox "¡Enorabuena!" & vbCr & "Se ha quitado la contraseña:" & vbCr & Contraseña
Exit Sub
End If
Next: Next: Next: Next: Next: Next
Next: Next: Next: Next: Next: Next
End Sub


