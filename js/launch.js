/* global FHIR, APP_CONFIG */
(() => {
  const params = new URLSearchParams(window.location.search);
  const iss = params.get("iss");
  const launch = params.get("launch");

  const statusEl = document.getElementById("status");
  const connectionEl = document.getElementById("fhir-connection");
  const connectionLabel = document.getElementById("fhir-connection-label");
  const simulator = document.getElementById("launch-simulator");
  const issInput = document.getElementById("iss-input");
  const launchInput = document.getElementById("launch-input");
  const launchButton = document.getElementById("launch-button");

  const setConnection = (connected, message) => {
    if (!connectionEl) return;
    connectionEl.classList.toggle("connected", connected);
    connectionEl.classList.toggle("disconnected", !connected);
    if (connectionLabel) connectionLabel.textContent = message;
  };

  const startAuthorize = (issValue, launchValue) => {
    statusEl.textContent = "Starting SMART on FHIR authorization...";
    const options = {
      clientId: APP_CONFIG.clientId,
      scope: APP_CONFIG.scope,
      redirectUri: APP_CONFIG.redirectUri,
      iss: issValue,
    };
    if (launchValue) options.launch = launchValue;
    FHIR.oauth2.authorize(options);
  };

  const pingMetadata = async (issValue) => {
    try {
      const response = await fetch(`${issValue.replace(/\/$/, "")}/metadata`);
      if (!response.ok) throw new Error("metadata not ok");
      setConnection(true, "FHIR connected");
    } catch {
      setConnection(false, "FHIR disconnected");
    }
  };

  if (iss) {
    simulator.style.display = "none";
    if (!launch) {
      statusEl.textContent = "Missing launch parameter. Expected launch in the URL.";
    } else {
      statusEl.textContent = "Starting SMART on FHIR authorization...";
    }
    pingMetadata(iss);
    if (launch) {
      startAuthorize(iss, launch);
    }
    return;
  }

  if (issInput) issInput.value = APP_CONFIG.defaultIss || "";
  statusEl.textContent = "Enter iss/launch to simulate EHR launch.";
  setConnection(false, "FHIR disconnected");
  simulator.style.display = "flex";

  launchButton?.addEventListener("click", () => {
    const issValue = issInput?.value?.trim();
    const launchValue = launchInput?.value?.trim();
    if (!issValue) {
      statusEl.textContent = "Please enter the FHIR Server (iss).";
      return;
    }
    pingMetadata(issValue);
    startAuthorize(issValue, launchValue);
  });
})();
