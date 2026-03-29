Attribute VB_Name = "modExportVbaSource"
Option Explicit

' Component type constants (late binding, no reference needed)
Private Const COMP_STD_MODULE As Long = 1    ' vbext_ct_StdModule
Private Const COMP_CLASS_MOD  As Long = 2    ' vbext_ct_ClassModule
Private Const COMP_MS_FORM    As Long = 3    ' vbext_ct_MSForm
Private Const COMP_DOCUMENT   As Long = 100  ' vbext_ct_Document

' ---------------------------------------------------------------
' ExportAllVbaSource
' Exports every VBA component from the active workbook into
' a src\ folder tree relative to the workbook file location.
' ---------------------------------------------------------------
Public Sub ExportAllVbaSource()

    On Error GoTo ErrHandler

    If ActiveWorkbook Is Nothing Then
        MsgBox "No workbook is open.", vbExclamation
        Exit Sub
    End If

    If Len(ActiveWorkbook.Path) = 0 Then
        MsgBox "The workbook must be saved to disk before exporting.", vbExclamation
        Exit Sub
    End If

    Dim rootPath As String
    rootPath = ActiveWorkbook.Path & "\src\"

    Dim modulesPath As String: modulesPath = rootPath & "Modules\"
    Dim classesPath As String: classesPath = rootPath & "Classes\"
    Dim formsPath   As String: formsPath = rootPath & "Forms\"
    Dim sheetsPath  As String: sheetsPath = rootPath & "Sheets\"

    ' Create folders if they do not exist
    EnsureFolder rootPath
    EnsureFolder modulesPath
    EnsureFolder classesPath
    EnsureFolder formsPath
    EnsureFolder sheetsPath

    Dim comp        As Object
    Dim filePath    As String
    Dim countMod    As Long
    Dim countCls    As Long
    Dim countFrm    As Long
    Dim countDoc    As Long

    For Each comp In ActiveWorkbook.VBProject.VBComponents

        Select Case comp.Type

            ' --- Standard module (.bas) ---
            Case COMP_STD_MODULE
                filePath = modulesPath & comp.Name & ".bas"
                comp.Export filePath
                countMod = countMod + 1

            ' --- Class module (.cls) ---
            Case COMP_CLASS_MOD
                filePath = classesPath & comp.Name & ".cls"
                comp.Export filePath
                countCls = countCls + 1

            ' --- UserForm (.frm + .frx) ---
            Case COMP_MS_FORM
                filePath = formsPath & comp.Name & ".frm"
                comp.Export filePath
                countFrm = countFrm + 1

            ' --- Document module (ThisWorkbook, Sheets) ---
            Case COMP_DOCUMENT
                countDoc = countDoc + ExportDocumentModule(comp, rootPath, sheetsPath)

        End Select

    Next comp

    Dim total As Long
    total = countMod + countCls + countFrm + countDoc

    MsgBox "Export complete." & vbCrLf & vbCrLf & _
           "Modules:    " & countMod & vbCrLf & _
           "Classes:    " & countCls & vbCrLf & _
           "UserForms:  " & countFrm & vbCrLf & _
           "Doc/Sheets: " & countDoc & vbCrLf & _
           "--------------------" & vbCrLf & _
           "Total files: " & total & vbCrLf & vbCrLf & _
           "Exported to: " & rootPath, _
           vbInformation, "VBA Export"

    Exit Sub

ErrHandler:
    MsgBox "Export failed." & vbCrLf & vbCrLf & _
           "Error " & Err.Number & ": " & Err.Description, _
           vbCritical, "VBA Export Error"

End Sub

' ---------------------------------------------------------------
' ExportDocumentModule
' Writes the code from a Document-type component (ThisWorkbook
' or a worksheet) to a .vba text file. Returns 1 if code was
' exported, 0 if the module was empty.
' ---------------------------------------------------------------
Private Function ExportDocumentModule( _
        ByVal comp As Object, _
        ByVal rootPath As String, _
        ByVal sheetsPath As String) As Long

    ' Skip empty code-behind modules
    If comp.CodeModule.CountOfLines = 0 Then
        ExportDocumentModule = 0
        Exit Function
    End If

    Dim code As String
    code = comp.CodeModule.Lines(1, comp.CodeModule.CountOfLines)

    Dim filePath As String

    If comp.Name = "ThisWorkbook" Then
        filePath = rootPath & "ThisWorkbook.vba"
    Else
        ' Build a safe filename from the component name
        Dim safeName As String
        safeName = SafeFileName(comp.Name)
        filePath = sheetsPath & safeName & ".vba"
    End If

    Dim fNum As Integer
    fNum = FreeFile
    Open filePath For Output As #fNum
    Print #fNum, "' SOURCE: " & comp.Name
    Print #fNum, "' Exported: " & Format$(Now, "yyyy-mm-dd hh:nn:ss")
    Print #fNum, "' -----------------------------------------------"
    Print #fNum, code
    Close #fNum

    ExportDocumentModule = 1

End Function

' ---------------------------------------------------------------
' EnsureFolder
' Creates the folder (and any missing parents) if it does not
' already exist.
' ---------------------------------------------------------------
Private Sub EnsureFolder(ByVal folderPath As String)
    If Dir(folderPath, vbDirectory) = "" Then
        Dim fso As Object
        Set fso = CreateObject("Scripting.FileSystemObject")
        If Not fso.FolderExists(folderPath) Then
            ' CreateFolder does not create intermediate folders,
            ' so walk the path segment by segment.
            CreateNestedFolder folderPath
        End If
        Set fso = Nothing
    End If
End Sub

' ---------------------------------------------------------------
' CreateNestedFolder
' Recursively creates all missing folders along a path.
' ---------------------------------------------------------------
Private Sub CreateNestedFolder(ByVal folderPath As String)
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")

    Dim parentPath As String
    parentPath = fso.GetParentFolderName(folderPath)

    If Not fso.FolderExists(parentPath) Then
        CreateNestedFolder parentPath
    End If

    If Not fso.FolderExists(folderPath) Then
        fso.CreateFolder folderPath
    End If

    Set fso = Nothing
End Sub

' ---------------------------------------------------------------
' SafeFileName
' Replaces characters that are not allowed in Windows filenames.
' ---------------------------------------------------------------
Private Function SafeFileName(ByVal s As String) As String
    Dim i As Long
    Dim ch As String
    Dim result As String
    Const BAD_CHARS As String = "\/:*?""<>|"

    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        If InStr(1, BAD_CHARS, ch) > 0 Then
            result = result & "_"
        Else
            result = result & ch
        End If
    Next i

    SafeFileName = result
End Function


