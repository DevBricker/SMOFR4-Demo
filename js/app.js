/* global FHIR, APP_CONFIG */
const ui = {
  patientName: document.getElementById("patient-name"),
  patientMeta: document.getElementById("patient-meta"),
  reportList: document.getElementById("report-list"),
  status: document.getElementById("status"),
  fhirConnection: document.getElementById("fhir-connection"),
  fhirConnectionLabel: document.getElementById("fhir-connection-label"),
  authWarning: document.getElementById("auth-warning"),
  devModeButton: document.getElementById("dev-mode-button"),
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
  if (name.text) return name.text;
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

const startApp = ({ client, patientId }) => {
    client
      .request("metadata")
      .then(() => setConnection(true, "FHIR connected"))
      .catch(() => setConnection(false, "FHIR disconnected"));
    ui.status.textContent = "Loading patient and reports...";
    if (!patientId) {
      ui.status.textContent = "Missing patient context.";
      return;
    }

    const patientPromise = client.request(`Patient/${patientId}`);
    const buildReportQuery = (includeCode) => {
      const params = [
        `patient=${encodeURIComponent(patientId)}`,
        "category=RAD,imaging",
        "_sort=-date",
      ];
      if (includeCode) {
        params.splice(
          2,
          0,
          `code=${encodeURIComponent(
            `${APP_CONFIG.ldctReportCodeSystem}|${APP_CONFIG.ldctReportCode}`
          )}`
        );
      }
      return ["DiagnosticReport", params.join("&")].join("?");
    };

    const reportPromise = client.request(buildReportQuery(true)).then((bundle) => {
      const entries = (bundle.entry || []).map((entry) => entry.resource);
      if (entries.length) return bundle;
      ui.status.textContent =
        "No matching report code found. Retrying without code filter...";
      return client.request(buildReportQuery(false));
    });

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
};

FHIR.oauth2
  .ready()
  .then((client) => startApp({ client, patientId: client.patient.id }))
  .catch((error) => {
    if (error?.message?.includes("state")) {
      ui.status.textContent = "Missing SMART state. Not authorized.";
      if (ui.authWarning) ui.authWarning.style.display = "flex";
      if (APP_CONFIG.devMode && ui.devModeButton) {
        ui.devModeButton.addEventListener("click", () => {
          ui.status.textContent =
            "Dev mode enabled. Using patient " + APP_CONFIG.devPatientId + ".";
          const client = FHIR.client({ serverUrl: APP_CONFIG.defaultIss });
          startApp({ client, patientId: APP_CONFIG.devPatientId });
        });
      }
      return;
    }

    ui.status.textContent = "Authorization failed.";
    // eslint-disable-next-line no-console
    console.error(error);
  });
