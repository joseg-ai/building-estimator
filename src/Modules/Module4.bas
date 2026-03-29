Attribute VB_Name = "Module4"
Sub Open_MAE()
Attribute Open_MAE.VB_ProcData.VB_Invoke_Func = " \n14"
'
' Open_MAE Macro
'

'
    Sheets("MAE").Select
    ActiveWindow.SelectedSheets.Visible = False
    Sheets("M").Select
    Sheets("MAE").Visible = True
    Sheets("MAE").Select
    ActiveWindow.SelectedSheets.Visible = False
End Sub
