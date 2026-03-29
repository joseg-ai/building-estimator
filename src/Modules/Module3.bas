Attribute VB_Name = "Module3"
Sub Macro1()
Attribute Macro1.VB_ProcData.VB_Invoke_Func = " \n14"
'
' Macro1 Macro
'

'

    ActiveSheet.Shapes.Range(Array("Picture 22")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    ActiveSheet.Shapes.Range(Array("Picture 46")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    ActiveSheet.Shapes.Range(Array("Picture 37")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
End Sub
