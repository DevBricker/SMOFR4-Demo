/* global FHIR, APP_CONFIG */
const ui = {
  patientName: document.getElementById("patient-name"),
  patientMeta: document.getElementById("patient-meta"),
  reportList: document.getElementById("report-list"),
  status: document.getElementById("status"),
  fhirConnection: document.getElementById("fhir-connection"),
  fhirConnectionLabel: document.getElementById("fhir-connection-label"),
};

const setConnection = (connected, message) => {
  if (!ui.fhirConnection) return;
  ui.fhirConnection.classList.toggle("connected", connected);
  ui.fhirConnection.classList.toggle("disconnected", !connected);
  if (ui.fhirConnectionLabel) {
    ui.fhirConnectionLabel.textContent = message;
  }
};

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatPatientName = (patient) => {
  const name = patient.name && patient.name[0];
  if (!name) return "Unknown";
  const given = (name.given || []).join(" ");
  return [given, name.family].filter(Boolean).join(" ").trim();
};

const formatCodeableConcept = (concept) => {
  if (!concept) return "";
  if (concept.text) return concept.text;
  const coding = concept.coding && concept.coding[0];
  if (!coding) return "";
  return coding.display || coding.code || "";
};

const extractReferenceId = (reference) => {
  if (!reference) return "";
  const parts = reference.split("/");
  return parts.length > 1 ? parts[1] : "";
};

const RADLEX_SYSTEM = "http://radlex.org";
const LUNG_RADS_ASSESSMENT_CODE = "RID50134";

const hasCoding = (concept, system, code) =>
  Array.isArray(concept?.coding) &&
  concept.coding.some(
    (coding) => coding.system === system && coding.code === code
  );

const formatCodingValue = (concept) => {
  if (!concept) return "";
  if (concept.text) return concept.text;
  const coding = concept.coding && concept.coding[0];
  if (!coding) return "";
  return coding.display || coding.code || "";
};

const findLungRadsCategory = (observations) => {
  for (const obs of observations) {
    if (!hasCoding(obs.code, RADLEX_SYSTEM, LUNG_RADS_ASSESSMENT_CODE)) {
      continue;
    }
    if (obs.valueCodeableConcept) {
      return formatCodingValue(obs.valueCodeableConcept) || "Unknown";
    }
  }
  return "Unknown";
};

const renderReportCard = (client, report) => {
  const card = document.createElement("a");
  card.className = "report-card";
  card.href = `${APP_CONFIG.reportUri}?id=${encodeURIComponent(report.id)}`;

  const date = document.createElement("div");
  date.className = "report-date";
  date.textContent = formatDate(report.effectiveDateTime || report.issued);

  const rads = document.createElement("div");
  rads.className = "report-rads";
  rads.textContent = "Loading...";

  const meta = document.createElement("div");
  meta.className = "report-meta";
  meta.textContent = "LDCT Lung-RADS v2022";

  card.append(date, rads, meta);
  ui.reportList.appendChild(card);

  const refs = (report.result || [])
    .map((res) => extractReferenceId(res.reference))
    .filter(Boolean)
    .map((id) => `Observation/${id}`);

  if (refs.length === 0) {
    rads.textContent = "Unknown";
    return;
  }

  Promise.all(refs.map((ref) => client.request(ref)))
    .then((observations) => {
      rads.textContent = findLungRadsCategory(observations);
    })
    .catch(() => {
      rads.textContent = "Unknown";
    });
};

FHIR.oauth2
  .ready()
  .then((client) => {
    client
      .request("metadata")
      .then(() => setConnection(true, "FHIR connected"))
      .catch(() => setConnection(false, "FHIR disconnected"));
    ui.status.textContent = "Loading patient and reports...";
    const patientId = client.patient.id;
    if (!patientId) {
      ui.status.textContent = "Missing patient context.";
      return;
    }

    const patientPromise = client.request(`Patient/${patientId}`);
    const reportQuery = [
      "DiagnosticReport",
      [
        `patient=${encodeURIComponent(patientId)}`,
        "category=imaging",
        `code=${encodeURIComponent(
          `${APP_CONFIG.ldctReportCodeSystem}|${APP_CONFIG.ldctReportCode}`
        )}`,
        "_sort=-date",
      ].join("&"),
    ].join("?");

    const reportPromise = client.request(reportQuery);

    return Promise.all([patientPromise, reportPromise]).then(
      ([patient, bundle]) => {
        ui.patientName.textContent = formatPatientName(patient);
        ui.patientMeta.textContent = [
          patient.gender ? patient.gender.toUpperCase() : "Unknown gender",
          patient.birthDate ? formatDate(patient.birthDate) : "Unknown DOB",
        ].join(" • ");

        const entries = (bundle.entry || []).map((entry) => entry.resource);
        if (!entries.length) {
          ui.status.textContent = "No LDCT Lung-RADS reports found.";
          return;
        }

        entries.forEach((report) => renderReportCard(client, report));
        ui.status.textContent = "";
      }
    );
  })
  .catch((error) => {
    ui.status.textContent = "Authorization failed.";
    // eslint-disable-next-line no-console
    console.error(error);
  });
