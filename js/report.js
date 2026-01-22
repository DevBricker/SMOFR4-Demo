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
  reportText: document.getElementById("report-text"),
  reportTextSection: document.getElementById("report-text-section"),
  pdfLink: document.getElementById("pdf-link"),
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

const normalizeLabel = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();

const matchCodeText = (code, pattern) => {
  const text = normalizeLabel(formatCodeableConcept(code));
  return text.includes(pattern);
};

const formatComponentValue = (component) => {
  if (!component) return "";
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
  if (typeof component.valueInteger === "number") {
    return String(component.valueInteger);
  }
  if (typeof component.valueDecimal === "number") {
    return String(component.valueDecimal);
  }
  return "";
};

const getComponentValue = (component, patterns) => {
  if (!component) return "";
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const matched = list.some((pattern) => matchCodeText(component.code, pattern));
  if (!matched) return "";
  return formatComponentValue(component);
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

const NODULE_SUMMARY_FIELDS = [
  { key: "size", label: "Size", patterns: ["entire"] },
  { key: "density", label: "Density", patterns: ["density"] },
  { key: "solidPart", label: "Solid Part", patterns: ["solid part"] },
  { key: "lobe", label: "Lobe", patterns: ["lobe"] },
  { key: "status", label: "Status", patterns: ["status"] },
  { key: "se", label: "SE", patterns: ["se"] },
  { key: "im", label: "IM", patterns: ["im"] },
];

const NODULE_DETAIL_GROUPS = [
  {
    title: "原始影像座標",
    fields: [
      { key: "originalSpacingX", label: "original_spacing_x", patterns: ["original spacing x"] },
      { key: "originalSpacingY", label: "original_spacing_y", patterns: ["original spacing y"] },
      { key: "originalSpacingZ", label: "original_spacing_z", patterns: ["original spacing z"] },
    ],
  },
  {
    title: "General",
    fields: [
      { key: "maxDiameter", label: "max_diameter", patterns: ["max diameter"] },
      { key: "radius", label: "radius", patterns: ["radius"] },
      { key: "maxRadius", label: "max_radius", patterns: ["max radius"] },
      { key: "perpDiameter", label: "perp_diameter", patterns: ["perp diameter"] },
      { key: "slice", label: "slice", patterns: ["slice"] },
    ],
  },
  {
    title: "Axial 橫切面",
    fields: [
      { key: "axialMaxDiameter", label: "axial max_diameter", patterns: ["axial max diameter"] },
      { key: "axialRadius", label: "axial radius", patterns: ["axial radius"] },
      { key: "axialMaxRadius", label: "axial max_radius", patterns: ["axial max radius"] },
      { key: "axialPerpDiameter", label: "axial perp_diameter", patterns: ["axial perp diameter"] },
      { key: "axialSlice", label: "axial slice", patterns: ["axial slice"] },
    ],
  },
  {
    title: "Coronal 冠狀切面",
    fields: [
      { key: "coronalMaxDiameter", label: "coronal max_diameter", patterns: ["coronal max diameter"] },
      { key: "coronalRadius", label: "coronal radius", patterns: ["coronal radius"] },
      { key: "coronalMaxRadius", label: "coronal max_radius", patterns: ["coronal max radius"] },
      { key: "coronalPerpDiameter", label: "coronal perp_diameter", patterns: ["coronal perp diameter"] },
      { key: "coronalSlice", label: "coronal slice", patterns: ["coronal slice"] },
    ],
  },
  {
    title: "其他資訊",
    fields: [
      { key: "solidPartDetail", label: "solid_part", patterns: ["solid part detail", "solid part"] },
      { key: "texture", label: "texture", patterns: ["texture"] },
      { key: "volume", label: "volume", patterns: ["volume"] },
      { key: "location", label: "location", patterns: ["location"] },
      { key: "malignancy", label: "malignancy", patterns: ["malignancy"] },
      { key: "margin", label: "margin", patterns: ["margin"] },
      { key: "followUpInfo", label: "follow_up_info", patterns: ["follow up info"] },
      { key: "volumeChange", label: "volume_change", patterns: ["volume change"] },
      { key: "volumeDoublingTime", label: "volume_doubling_time", patterns: ["volume doubling time"] },
      { key: "description", label: "description", patterns: ["description"] },
      { key: "lungRads", label: "lungRADS", patterns: ["lungrads"] },
      { key: "cacScore", label: "cac_score", patterns: ["cac score"] },
    ],
  },
];

const NODULE_DETAIL_FIELDS = NODULE_DETAIL_GROUPS.flatMap((group) => group.fields);

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
    details: {},
  };

  for (const comp of observation.component) {
    NODULE_SUMMARY_FIELDS.forEach((field) => {
      if (nodule[field.key]) return;
      const value = getComponentValue(comp, field.patterns);
      if (value) nodule[field.key] = value;
    });

    NODULE_DETAIL_FIELDS.forEach((field) => {
      if (nodule.details[field.key]) return;
      const value = getComponentValue(comp, field.patterns);
      if (value) nodule.details[field.key] = value;
    });
  }

  const summaryValues = NODULE_SUMMARY_FIELDS.map((field) => nodule[field.key]);
  const detailValues = Object.values(nodule.details);
  const hasData = [...summaryValues, ...detailValues].some((value) => value);
  return hasData ? nodule : null;
};

const renderNoduleCard = (nodule, index) => {
  const card = document.createElement("div");
  card.className = "nodule-card";

  const title = document.createElement("div");
  title.className = "nodule-title";
  title.textContent = `Nodule ${index + 1}`;

  const lines = NODULE_SUMMARY_FIELDS.map((field) => [
    field.label,
    nodule[field.key],
  ]);

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

  const detailWrapper = document.createElement("div");
  detailWrapper.className = "nodule-details";

  NODULE_DETAIL_GROUPS.forEach((group) => {
    const rows = group.fields
      .map((field) => ({
        label: field.label,
        value: nodule.details[field.key],
      }))
      .filter((row) => row.value);
    if (!rows.length) return;

    const section = document.createElement("div");
    section.className = "nodule-detail-section";

    const sectionTitle = document.createElement("div");
    sectionTitle.className = "nodule-detail-title";
    sectionTitle.textContent = group.title;

    const table = document.createElement("div");
    table.className = "data-table";

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "data-row";

      const label = document.createElement("div");
      label.className = "data-label";
      label.textContent = row.label;

      const value = document.createElement("div");
      value.className = "data-value";
      value.textContent = row.value;

      rowEl.append(label, value);
      table.appendChild(rowEl);
    });

    section.append(sectionTitle, table);
    detailWrapper.appendChild(section);
  });

  if (detailWrapper.childElementCount) {
    card.appendChild(detailWrapper);
  }
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

const renderReportData = ({ patient, report, observations }) => {
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

  const other = observations.map((obs) => obs.valueString).filter(Boolean);
  ui.otherFindings.textContent = other.length
    ? other.join("; ")
    : "No other findings.";

  if (report.text && report.text.div && ui.reportText && ui.reportTextSection) {
    ui.reportText.innerHTML = report.text.div;
    ui.reportTextSection.style.display = "block";
  } else if (ui.reportTextSection) {
    ui.reportTextSection.style.display = "none";
  }

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
};

const loadDemoBundle = (bundleUrl) =>
  fetch(bundleUrl)
    .then((response) => response.json())
    .then((bundle) => {
      const resources = (bundle.entry || []).map((entry) => entry.resource);
      const report = resources.find(
        (resource) => resource.resourceType === "DiagnosticReport"
      );
      const patient = resources.find(
        (resource) => resource.resourceType === "Patient"
      );
      const obsById = resources
        .filter((resource) => resource.resourceType === "Observation")
        .reduce((acc, obs) => {
          acc[obs.id] = obs;
          return acc;
        }, {});
      const observations = (report?.result || [])
        .map((res) => extractReferenceId(res.reference))
        .map((id) => obsById[id])
        .filter(Boolean);

      if (!report) {
        throw new Error("Demo bundle missing DiagnosticReport.");
      }

      return { patient, report, observations };
    });

const startReport = (client) => {
  client
    .request("metadata")
    .then(() => setConnection(true, "FHIR connected"))
    .catch(() => setConnection(false, "FHIR disconnected"));
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get("id");
  const useDemo = params.get("demo") === "true";
  if (!reportId && useDemo) {
    ui.status.textContent = "Loading demo report...";
    return loadDemoBundle("./sample/01_bundle_transaction_nodule_detail.json")
      .then(renderReportData)
      .catch(() => {
        ui.status.textContent = "Failed to load demo report.";
      });
  }
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
      ([patient, observations]) => renderReportData({ patient, report, observations })
    );
  });
};

FHIR.oauth2
  .ready()
  .then((client) => startReport(client))
  .catch((error) => {
    if (error?.message?.includes("state")) {
      ui.status.textContent = "Missing SMART state. Not authorized.";
      if (ui.authWarning) ui.authWarning.style.display = "flex";
      if (APP_CONFIG.devMode && ui.devModeButton) {
        ui.devModeButton.addEventListener("click", () => {
          ui.status.textContent = "Dev mode enabled.";
          const client = FHIR.client({ serverUrl: APP_CONFIG.defaultIss });
          startReport(client);
        });
      }
      return;
    }

    ui.status.textContent = "Failed to load report.";
    // eslint-disable-next-line no-console
    console.error(error);
  });
