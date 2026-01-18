/* global FHIR, APP_CONFIG */
const ui = {
  status: document.getElementById("status"),
  patientName: document.getElementById("patient-name"),
  patientMeta: document.getElementById("patient-meta"),
  reportMeta: document.getElementById("report-meta"),
  lungRads: document.getElementById("lung-rads"),
  doseInfo: document.getElementById("dose-info"),
  nodules: document.getElementById("nodules"),
  otherFindings: document.getElementById("other-findings"),
  pdfLink: document.getElementById("pdf-link"),
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

const extractReferenceId = (reference) => {
  if (!reference) return "";
  const parts = reference.split("/");
  return parts.length > 1 ? parts[1] : "";
};

const matchCodeText = (code, pattern) => {
  const text = (formatCodeableConcept(code) || "").toLowerCase();
  return text.includes(pattern);
};

const getComponentValue = (component, pattern) => {
  if (!component) return "";
  if (!matchCodeText(component.code, pattern)) return "";
  if (component.valueQuantity) {
    const value = component.valueQuantity.value;
    const unit = component.valueQuantity.unit || component.valueQuantity.code || "";
    return [value, unit].filter((part) => part !== "").join(" ");
  }
  if (component.valueCodeableConcept) {
    return formatCodeableConcept(component.valueCodeableConcept);
  }
  if (component.valueString) {
    return component.valueString;
  }
  if (typeof component.valueBoolean === "boolean") {
    return component.valueBoolean ? "Yes" : "No";
  }
  return "";
};

const parseSummaryObservation = (observations) => {
  const summary = {
    quality: "",
    ctdi: "",
    dlp: "",
    lungRads: "",
    modifierS: "",
    recommendation: "",
  };

  for (const obs of observations) {
    if (!summary.lungRads && hasCoding(obs.code, RADLEX_SYSTEM, LUNG_RADS_ASSESSMENT_CODE)) {
      summary.lungRads = formatCodingValue(obs.valueCodeableConcept);
    }
    if (!Array.isArray(obs.component)) continue;
    for (const comp of obs.component) {
      if (!summary.quality) summary.quality = getComponentValue(comp, "quality");
      if (!summary.ctdi) summary.ctdi = getComponentValue(comp, "ctdi");
      if (!summary.dlp) summary.dlp = getComponentValue(comp, "dlp");
      if (!summary.modifierS)
        summary.modifierS = getComponentValue(comp, "modifier s");
      if (!summary.recommendation)
        summary.recommendation = getComponentValue(comp, "recommendation");
    }
  }

  return summary;
};

const parseNoduleObservation = (observation) => {
  if (!Array.isArray(observation.component)) return null;
  const nodule = {
    size: "",
    density: "",
    solidPart: "",
    lobe: "",
    status: "",
    se: "",
    im: "",
  };

  for (const comp of observation.component) {
    if (!nodule.size) nodule.size = getComponentValue(comp, "entire");
    if (!nodule.density) nodule.density = getComponentValue(comp, "density");
    if (!nodule.solidPart) nodule.solidPart = getComponentValue(comp, "solid");
    if (!nodule.lobe) nodule.lobe = getComponentValue(comp, "lobe");
    if (!nodule.status) nodule.status = getComponentValue(comp, "status");
    if (!nodule.se) nodule.se = getComponentValue(comp, "se");
    if (!nodule.im) nodule.im = getComponentValue(comp, "im");
  }

  const hasData = Object.values(nodule).some((value) => value);
  return hasData ? nodule : null;
};

const renderNoduleCard = (nodule, index) => {
  const card = document.createElement("div");
  card.className = "nodule-card";

  const title = document.createElement("div");
  title.className = "nodule-title";
  title.textContent = `Nodule ${index + 1}`;

  const lines = [
    ["Size", nodule.size],
    ["Density", nodule.density],
    ["Solid Part", nodule.solidPart],
    ["Lobe", nodule.lobe],
    ["Status", nodule.status],
    ["SE", nodule.se],
    ["IM", nodule.im],
  ];

  const list = document.createElement("div");
  list.className = "nodule-list";
  lines.forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement("div");
    row.className = "nodule-row";
    row.textContent = `${label}: ${value}`;
    list.appendChild(row);
  });

  card.append(title, list);
  return card;
};

const renderDoseInfo = (summary) => {
  const lines = [
    ["LDCT Quality", summary.quality],
    ["CTDIvol", summary.ctdi],
    ["Total DLP", summary.dlp],
    ["Modifier S", summary.modifierS],
    ["Recommendation", summary.recommendation],
  ];

  ui.doseInfo.innerHTML = "";
  lines.forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement("div");
    row.className = "dose-row";
    row.textContent = `${label}: ${value}`;
    ui.doseInfo.appendChild(row);
  });
};

FHIR.oauth2
  .ready()
  .then((client) => {
    client
      .request("metadata")
      .then(() => setConnection(true, "FHIR connected"))
      .catch(() => setConnection(false, "FHIR disconnected"));
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id");
    if (!reportId) {
      ui.status.textContent = "Missing report id.";
      return;
    }

    ui.status.textContent = "Loading report...";

    return client.request(`DiagnosticReport/${reportId}`).then((report) => {
      const patientId =
        extractReferenceId(report.subject && report.subject.reference) ||
        client.patient.id;

      const patientPromise = patientId
        ? client.request(`Patient/${patientId}`)
        : Promise.resolve(null);

      const observationRefs = (report.result || [])
        .map((res) => extractReferenceId(res.reference))
        .filter(Boolean)
        .map((id) => `Observation/${id}`);

      const observationPromise = Promise.all(
        observationRefs.map((ref) => client.request(ref))
      );

      return Promise.all([patientPromise, observationPromise]).then(
        ([patient, observations]) => {
          if (patient) {
            ui.patientName.textContent = formatPatientName(patient);
            ui.patientMeta.textContent = [
              patient.gender ? patient.gender.toUpperCase() : "Unknown gender",
              patient.birthDate ? formatDate(patient.birthDate) : "Unknown DOB",
            ].join(" • ");
          }

          ui.reportMeta.textContent = [
            `Study date: ${formatDate(report.effectiveDateTime)}`,
            `Issued: ${formatDate(report.issued)}`,
          ].join(" • ");

          const summary = parseSummaryObservation(observations);
          ui.lungRads.textContent = summary.lungRads || "Unknown";
          renderDoseInfo(summary);

          const nodules = observations
            .map((obs) => parseNoduleObservation(obs))
            .filter(Boolean)
            .slice(0, 3);

          ui.nodules.innerHTML = "";
          if (nodules.length === 0) {
            ui.nodules.textContent = "No nodules recorded.";
          } else {
            nodules.forEach((nodule, index) => {
              ui.nodules.appendChild(renderNoduleCard(nodule, index));
            });
          }

          const other = observations
            .map((obs) => obs.valueString)
            .filter(Boolean);
          ui.otherFindings.textContent = other.length
            ? other.join("; ")
            : "No other findings.";

          if (
            Array.isArray(report.presentedForm) &&
            report.presentedForm[0] &&
            report.presentedForm[0].url
          ) {
            ui.pdfLink.href = report.presentedForm[0].url;
            ui.pdfLink.textContent = "Open original PDF";
          } else {
            ui.pdfLink.textContent = "No PDF attached.";
            ui.pdfLink.removeAttribute("href");
          }

          ui.status.textContent = "";
        }
      );
    });
  })
  .catch((error) => {
    ui.status.textContent = "Failed to load report.";
    // eslint-disable-next-line no-console
    console.error(error);
  });
