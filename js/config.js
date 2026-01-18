// App configuration for SMART on FHIR EHR Launch.
// Replace clientId with your registered app ID and baseUrl if you host elsewhere.
window.APP_CONFIG = {
  clientId: "YOUR_CLIENT_ID",
  scope: [
    "openid",
    "profile",
    "launch",
    "launch/patient",
    "patient/Patient.read",
    "patient/DiagnosticReport.read",
    "patient/Observation.read",
    "patient/ImagingStudy.read",
  ].join(" "),
  redirectUri: "/app.html",
  launchUri: "/launch.html",
  reportUri: "/report.html",
  ldctReportCodeSystem: "http://your-org.tw/fhir/CodeSystem/ldct",
  ldctReportCode: "lung-rads-2022-report",
};
