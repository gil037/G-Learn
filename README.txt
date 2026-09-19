GPE TRAINING CENTER PORTAL - GOOGLE APPS SCRIPT PROTOTYPE V1

Purpose:
Prototype with full navigation, responsive corporate UI, role simulation and dummy content.
Google Sheets integration is active for Employee Master, Training Request, Document Management, and Employee Versatility. Other menu modules remain prototype/dummy content unless marked as connected.

FILES:
Code.gs
Config.gs
Index.html
Login.html
Sidebar.html
TopNavbar.html
Styles.html
Scripts.html
Home.html
Dashboard.html
EmployeeMaster.html
TrainingRequest.html
TrainingAttendance.html
TrainingMonitoring.html
CandidateRegistration.html
OrientationAttendance.html
RecruitmentMonitoring.html
EmployeeAssessment.html
EmployeeInduction.html
SimulatorTraining.html
TrainingModules.html
Forms.html
JSA.html
SOP.html
WorkInstruction.html
SMKPDocuments.html
JobCreate.html
JobList.html
JobHistory.html
About.html

DEPLOYMENT:
1. Create a new Google Apps Script project.
2. Create each file using the exact filename shown above.
3. Paste each file content into its corresponding file.
4. Save the project.
5. Run Deploy > New deployment > Web app.
6. Choose Execute as: Me.
7. Choose who has access according to your organization requirements.
8. Open the Web App URL.

ROLE SIMULATION:
Login roles are Administrator, Trainer/Instruktur, and Guest. Authorization is validated server-side using session tokens; the client navigation is only a presentation layer.

IMPORTANT:
Google Apps Script editor does not support actual folder grouping in the same way as a local IDE.
Use the flat filenames supplied in this package. The names already indicate each module.
