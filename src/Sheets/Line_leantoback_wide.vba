' SOURCE: Line_leantoback_wide
' Exported: 2026-03-29 13:53:20
' -----------------------------------------------



Private Sub CheckBox1_Click()

If Worksheets("Design").Range("E7").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 92")).Select
    Selection.ShapeRange.ZOrder msoSendToBack

Else
    ActiveSheet.Shapes.Range(Array("Picture 33")).Select
    Selection.ShapeRange.ZOrder msoSendToBack
End If

End Sub

Private Sub CheckBox12_Click()

End Sub

Private Sub CheckBox13_Click()

End Sub

Sub SFDAS()
    Selection.ShapeRange.ZOrder msoSendToBack
'ALL INSULACION
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
'WALL INSULATION
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
'NO INSULATION
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
'ROOF INSULATION
    ActiveSheet.Shapes.Range(Array("Picture 214")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
End Sub

Private Sub CheckBox16_Click()
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 214")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else

End If
End If
End If
End If
End If
End If
End If
End If
End If

End Sub

Private Sub CheckBox17_Click()
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 214")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else

End If
End If
End If
End If
End If
End If
End If
End If
End If

End Sub



Private Sub CheckBox18_Click()
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 214")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = True And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 212")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = True And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = True Then
    ActiveSheet.Shapes.Range(Array("Picture 213")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else
If Worksheets("Design").Range("D102").Value = False And Worksheets("Design").Range("D103").Value = False And Worksheets("Design").Range("D104").Value = False Then
    ActiveSheet.Shapes.Range(Array("Picture 211")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
Else

End If
End If
End If
End If
End If
End If
End If
End If
End If

End Sub


Private Sub CheckBox19_Click()

End Sub

'**************************************************************************************************************
'**************************************************************************************************************
'Activate Lean to right    ************************************************************************************
'**************************************************************************************************************
'**************************************************************************************************************

Private Sub CheckBox2_Click()




    
If Worksheets("Design").Range("D28").Value = False Then

    ActiveSheet.Shapes.Range(Array("Rectangle 95")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    
    ActiveSheet.Shapes.Range(Array("Rectangle 76")).Select
    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    
Text_LeantoRight.Visible = False
Text_LeantoRight_Length.Visible = False
Text_LeantoRight_Wide.Visible = False
Text_LeantoRight_Area.Visible = False

    ActiveSheet.Shapes.Range(Array("Line_LeantoRight_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoRight_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

Else

    ActiveSheet.Shapes.Range(Array("Rectangle 95")).Select
    Selection.ShapeRange.ZOrder msoSendToBack
    
    ActiveSheet.Shapes.Range(Array("Rectangle 76")).Select

    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.0500000007
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.25
        .Transparency = 0
        .Solid
    End With

Text_LeantoRight.Visible = True
Text_LeantoRight_Length.Visible = True
Text_LeantoRight_Wide.Visible = True
Text_LeantoRight_Area.Visible = True

    ActiveSheet.Shapes.Range(Array("Line_LeantoRight_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoRight_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With


End If








'Shapes("Rectangle 98").Visible = False
'Shapes("Line_leantoback_Wide").Visible = False
'Shapes("Line_leantoback_Lenght").Visible = False





End Sub





'**************************************************************************************************************
'**************************************************************************************************************
'Activate Lean to Left    ************************************************************************************
'**************************************************************************************************************
'**************************************************************************************************************

Private Sub CheckBox3_Click()



If Worksheets("Design").Range("G28").Value = False Then
    ActiveSheet.Shapes.Range(Array("Rectangle 10")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    
    ActiveSheet.Shapes.Range(Array("Rectangle 79")).Select
    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

Text_LeantoLeft.Visible = False
Text_LeantoLeft_Length.Visible = False
Text_LeantoLeft_Wide.Visible = False
Text_LeantoLeft_Area.Visible = False

    ActiveSheet.Shapes.Range(Array("Line_LeantoLeft_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoLeft_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    
Else

    ActiveSheet.Shapes.Range(Array("Rectangle 10")).Select
    Selection.ShapeRange.ZOrder msoSendToBack
    
    ActiveSheet.Shapes.Range(Array("Rectangle 79")).Select

    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.0500000007
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.25
        .Transparency = 0
        .Solid
    End With

Text_LeantoLeft.Visible = True
Text_LeantoLeft_Length.Visible = True
Text_LeantoLeft_Wide.Visible = True
Text_LeantoLeft_Area.Visible = True

    ActiveSheet.Shapes.Range(Array("Line_LeantoLeft_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoLeft_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

End If

End Sub


'**************************************************************************************************************
'**************************************************************************************************************
'Activate Lean to Front    ************************************************************************************
'**************************************************************************************************************
'**************************************************************************************************************

Private Sub CheckBox4_Click()
    
If Worksheets("Design").Range("D39").Value = False Then
    ActiveSheet.Shapes.Range(Array("Rectangle 96")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    
    ActiveSheet.Shapes.Range(Array("Rectangle 78")).Select
    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    
Text_LeantoFront.Visible = False
Text_LeantoFront_Length.Visible = False
Text_LeantoFront_Wide.Visible = False
Text_LeantoFront_Area.Visible = False

    ActiveSheet.Shapes.Range(Array("Line_LeantoFront_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoFront_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

Else
    ActiveSheet.Shapes.Range(Array("Rectangle 96")).Select
    Selection.ShapeRange.ZOrder msoSendToBack
    
    ActiveSheet.Shapes.Range(Array("Rectangle 78")).Select

    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.0500000007
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.25
        .Transparency = 0
        .Solid
    End With


Text_LeantoFront.Visible = True
Text_LeantoFront_Length.Visible = True
Text_LeantoFront_Wide.Visible = True
Text_LeantoFront_Area.Visible = True

    ActiveSheet.Shapes.Range(Array("Line_LeantoFront_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoFront_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
End If

End Sub


'**************************************************************************************************************
'**************************************************************************************************************
'Activate Lean to back    ************************************************************************************
'**************************************************************************************************************
'**************************************************************************************************************

Private Sub CheckBox5_Click()
If Worksheets("Design").Range("G39").Value = False Then

    ActiveSheet.Shapes.Range(Array("Rectangle 97")).Select
    Selection.ShapeRange.ZOrder msoBringToFront
    
    ActiveSheet.Shapes.Range(Array("Rectangle 99")).Select
    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

Text_LeantoBack.Visible = False
Text_Leantoback_Length.Visible = False
Text_Leantoback_Wide.Visible = False
Text_Leantoback_area.Visible = False

    ActiveSheet.Shapes.Range(Array("Line_LeantoBack_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoBack_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With


Else
    ActiveSheet.Shapes.Range(Array("Rectangle 97")).Select
    Selection.ShapeRange.ZOrder msoSendToBack
    
    ActiveSheet.Shapes.Range(Array("Rectangle 99")).Select

    With Selection.ShapeRange.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.0500000007
        .Transparency = 0
        .Solid
    End With
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
    With Selection.ShapeRange.TextFrame2.TextRange.Font.Fill
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorBackground1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = -0.25
        .Transparency = 0
        .Solid
    End With

Text_LeantoBack.Visible = True
Text_Leantoback_Length.Visible = True
Text_Leantoback_Wide.Visible = True
Text_Leantoback_area.Visible = True

    ActiveSheet.Shapes.Range(Array("Line_LeantoBack_Length")).Select

    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With

    ActiveSheet.Shapes.Range(Array("Line_LeantoBack_Wide")).Select
    
    With Selection.ShapeRange.Line
        .Visible = msoTrue
        .ForeColor.ObjectThemeColor = msoThemeColorText1
        .ForeColor.TintAndShade = 0
        .ForeColor.Brightness = 0
        .Transparency = 0
    End With
End If

End Sub


Private Sub CheckBox6_Click()

End Sub

Private Sub CommandButton1_Click()
'Close Design
    Sheets("Design").Visible = False
    Sheets("Menu").Select
End Sub

Private Sub CommandButton2_Click()
    Range("D3") = "0"
    Range("D4") = "0"
    Range("D5") = "0"
    Range("D6") = "0"
    Range("E7") = "FALSE"
    Range("F8") = "0"
    Range("G8") = "0"
    Range("D9") = "FALSE"
    Range("D10") = "FALSE"
    Range("G3") = "FALSE"
    Range("G4") = "FALSE"
    Range("E10") = "0"
    Range("F10") = "0"
    Range("D18") = "0"
    Range("D19") = "0"
    Range("D20") = "0"
    Range("D21") = "0"
    Range("D28") = "FALSE"
    Range("G28") = "FALSE"
    Range("C29") = "0"
    Range("C30") = "0"
    Range("C31") = "0"
    Range("C32") = "0"
    Range("F29") = "0"
    Range("F30") = "0"
    Range("F31") = "0"
    Range("F32") = "0"
    Range("D39") = "FALSE"
    Range("G39") = "FALSE"
    Range("C40") = "0"
    Range("C41") = "0"
    Range("C42") = "0"
    Range("C43") = "0"
    Range("F40") = "0"
    Range("F41") = "0"
    Range("F42") = "0"
    Range("F43") = "0"
    Range("D51") = "FALSE"
    Range("D52") = "FALSE"
    Range("D53") = "FALSE"
    Range("D54") = "FALSE"
    Range("D55") = "FALSE"
    Range("D57") = "FALSE"
    Range("F52") = "0"
    Range("F54") = "0"
    Range("D59") = "FALSE"
    Range("D60") = "FALSE"
    
    Range("F59") = "0"
    Range("F60") = "0"
    
    Range("D65") = "0"
    Range("D66") = "0"
    Range("D67") = "0"
    Range("D68") = "0"
    Range("D69") = "0"
    Range("D70") = "0"
    Range("D71") = "0"
    Range("D72") = "0"
    Range("D73") = "0"
    Range("D74") = "0"
    Range("D75") = "0"
    Range("D76") = "0"
    Range("D77") = "0"
    Range("E65") = "FALSE"
    Range("E66") = "FALSE"
    Range("E69") = "FALSE"
    Range("D79") = "0"
    Range("D80") = "0"
    Range("D81") = "0"
    Range("D82") = "0"
    Range("E79") = "FALSE"
    Range("E80") = "FALSE"
    Range("E81") = "FALSE"
    Range("E82") = "FALSE"
    Range("F70") = "0"
    Range("F71") = "0"
    Range("F72") = "0"
    Range("F73") = "0"
    Range("F74") = "0"
    Range("F75") = "0"
    Range("F76") = "0"
    Range("F77") = "0"
    Range("G70") = "0"
    Range("G71") = "0"
    Range("G72") = "0"
    Range("G73") = "0"
    Range("G74") = "0"
    Range("G75") = "0"
    Range("G76") = "0"
    Range("G77") = "0"
    

    
    Range("D87") = "0"
    Range("D88") = "0"
    Range("D89") = "0"
    Range("D90") = "0"
    Range("D92") = "0"
    Range("D93") = "0"
    Range("D94") = "0"
    Range("D95") = "0"
    Range("D97") = "0"
    Range("D98") = "0"
    Range("D99") = "0"
    Range("E87") = "0"
    Range("E88") = "0"
    Range("E89") = "0"
    Range("E90") = "0"
    Range("E92") = "0"
    Range("E93") = "0"
    Range("E94") = "0"
    Range("E95") = "0"
    Range("F87") = "0"
    Range("F88") = "0"
    Range("F89") = "0"
    Range("F90") = "0"
    Range("F92") = "0"
    Range("F93") = "0"
    Range("F94") = "0"
    Range("F95") = "0"
    Range("G87") = "0"
    Range("G88") = "0"
    Range("G89") = "0"
    Range("G90") = "0"
    Range("G92") = "0"
    Range("G93") = "0"
    Range("G94") = "0"
    Range("G95") = "0"
    Range("D97") = "0"
    Range("D98") = "0"
    Range("D99") = "0"
    Range("D102") = "FALSE"
    Range("D103") = "FALSE"
    Range("D104") = "FALSE"
End Sub

Private Sub TextBox2_Change()

End Sub
