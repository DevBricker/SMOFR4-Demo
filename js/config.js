// App configuration for SMART on FHIR EHR Launch.
// Replace clientId with your registered app ID and baseUrl if you host elsewhere.
window.APP_CONFIG = {
  clientId: "cc344727-6f90-496c-94fd-c7829aa9a51d",
  clientSecret: "79f04b56b33491716c0880af72cdef7d3f0629111421cedd18353651cd313d9e",
  scope: [
    "launch",
    "openid",
    "fhirUser",
    "launch/patient",
    "patient/Patient.read",
    "patient/DiagnosticReport.read",
    "patient/Observation.read",
    "patient/ImagingStudy.read",
  ].join(" "),
  redirectUri: "https://devbricker.github.io/SMOFR4-Demo/app.html",
  launchUri: "./launch.html",
  reportUri: "./report.html",
  ldctReportCodeSystem: "http://your-org.tw/fhir/CodeSystem/ldct",
  ldctReportCode: "lung-rads-2022-report",
  defaultIss: "https://thas.mohw.gov.tw/v/r4/fhir",
  devMode: true,
  devPatientId: "695311",
};
