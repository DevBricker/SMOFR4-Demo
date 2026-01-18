/* global FHIR, APP_CONFIG */
(() => {
  const params = new URLSearchParams(window.location.search);
  const iss = params.get("iss");
  const launch = params.get("launch");

  const statusEl = document.getElementById("status");
  if (!iss || !launch) {
    statusEl.textContent =
      "Missing launch parameters. Expected iss and launch in the URL.";
    return;
  }

  statusEl.textContent = "Starting SMART on FHIR authorization...";

  FHIR.oauth2.authorize({
    clientId: APP_CONFIG.clientId,
    scope: APP_CONFIG.scope,
    redirectUri: APP_CONFIG.redirectUri,
    iss,
    launch,
  });
})();
