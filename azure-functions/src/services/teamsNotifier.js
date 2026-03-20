/**
 * Teams Notifier Service
 *
 * Sends an Adaptive Card to a Microsoft Teams channel via an Incoming Webhook
 * to notify staff about a newly confirmed CT appointment.
 *
 * Adaptive Cards reference: https://learn.microsoft.com/zh-tw/adaptive-cards/
 */

/**
 * Formats a date-time string to a human-readable Traditional Chinese format.
 * @param {string} isoString - ISO 8601 datetime string
 * @returns {string} e.g. "2026/03/20 (五) 09:30"
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDay = weekDays[date.getDay()];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} (${weekDay}) ${hh}:${min}`;
}

/**
 * Builds a Microsoft Adaptive Card payload for a CT appointment confirmation.
 * Spec: https://adaptivecards.io/schemas/adaptive-card.json (schema v1.5)
 *
 * @param {object} appointment - Appointment details from the schedule service
 * @param {object} patient - Patient details from the RIS service
 * @returns {object} Adaptive Card JSON payload
 */
function buildAppointmentAdaptiveCard(appointment, patient) {
  const appointmentTimeFormatted = formatDateTime(appointment.appointmentDateTime);
  const endTimeFormatted = formatDateTime(appointment.endDateTime);

  const instructionFacts = appointment.instructions.map((instruction, index) => ({
    type: "TextBlock",
    text: `${index + 1}. ${instruction}`,
    wrap: true,
    size: "Small",
    color: "Default",
  }));

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            {
              type: "Container",
              style: "emphasis",
              items: [
                {
                  type: "ColumnSet",
                  columns: [
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        {
                          type: "TextBlock",
                          text: "🏥 AI 影像預約系統",
                          weight: "Bolder",
                          size: "Medium",
                          color: "Accent",
                        },
                        {
                          type: "TextBlock",
                          text: "CT 檢查預約確認通知",
                          size: "Small",
                          isSubtle: true,
                          spacing: "None",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "Container",
              items: [
                {
                  type: "TextBlock",
                  text: "✅ 預約已成功確認",
                  weight: "Bolder",
                  size: "Large",
                  color: "Good",
                },
                {
                  type: "FactSet",
                  facts: [
                    {
                      title: "預約編號",
                      value: appointment.appointmentNumber,
                    },
                    {
                      title: "確認碼",
                      value: appointment.confirmationCode,
                    },
                    {
                      title: "RIS 醫囑號",
                      value: appointment.orderNumber,
                    },
                  ],
                },
              ],
            },
            {
              type: "Container",
              separator: true,
              items: [
                {
                  type: "TextBlock",
                  text: "👤 病人資料",
                  weight: "Bolder",
                  size: "Medium",
                },
                {
                  type: "FactSet",
                  facts: [
                    { title: "病歷號 (MRN)", value: patient.mrn },
                    { title: "姓名", value: patient.name },
                    { title: "性別", value: patient.gender === "M" ? "男" : "女" },
                    { title: "出生日期", value: patient.dateOfBirth },
                    { title: "科別", value: patient.department },
                    { title: "主治醫師", value: patient.attendingPhysician },
                  ],
                },
              ],
            },
            {
              type: "Container",
              separator: true,
              items: [
                {
                  type: "TextBlock",
                  text: "🔬 檢查資訊",
                  weight: "Bolder",
                  size: "Medium",
                },
                {
                  type: "FactSet",
                  facts: [
                    { title: "檢查種類", value: appointment.examTypeName },
                    { title: "檢查代碼", value: appointment.examTypeCode },
                    { title: "預約時間", value: appointmentTimeFormatted },
                    { title: "結束時間", value: endTimeFormatted },
                    { title: "檢查室", value: appointment.room },
                    { title: "預計時長", value: `${appointment.durationMinutes} 分鐘` },
                    { title: "開單醫師", value: appointment.orderingPhysician },
                  ],
                },
              ],
            },
            {
              type: "Container",
              separator: true,
              style: "warning",
              items: [
                {
                  type: "TextBlock",
                  text: "📋 注意事項",
                  weight: "Bolder",
                  size: "Medium",
                },
                ...instructionFacts,
              ],
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "查看預約詳情",
              url: `https://hospital-portal.local/appointments/${appointment.appointmentNumber}`,
              style: "positive",
            },
            {
              type: "Action.OpenUrl",
              title: "取消預約",
              url: `https://hospital-portal.local/appointments/${appointment.appointmentNumber}/cancel`,
              style: "destructive",
            },
          ],
          msteams: {
            width: "Full",
          },
        },
      },
    ],
  };
}

/**
 * Sends a Teams Adaptive Card notification via an Incoming Webhook URL.
 *
 * If TEAMS_WEBHOOK_URL is not configured or starts with "https://your-tenant",
 * the function runs in simulation mode and logs the card payload without
 * making an actual HTTP request.
 *
 * @param {object} appointment - Appointment details from the schedule service
 * @param {object} patient - Patient details from the RIS service
 * @param {object} logger - Azure Functions logger (context.log)
 * @returns {Promise<{ success: boolean, simulated?: boolean, error?: string }>}
 */
async function sendTeamsNotification(appointment, patient, logger) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  const cardPayload = buildAppointmentAdaptiveCard(appointment, patient);

  // Simulation mode: no real webhook configured
  if (!webhookUrl || webhookUrl.startsWith("https://your-tenant")) {
    logger.warn(
      "[TeamsNotifier] TEAMS_WEBHOOK_URL 未設定，進入模擬模式 — 以下為 Adaptive Card 內容："
    );
    logger.info(JSON.stringify(cardPayload, null, 2));
    return { success: true, simulated: true };
  }

  try {
    // Dynamic import of node-fetch (ESM compatible)
    const { default: fetch } = await import("node-fetch");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardPayload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error(
        `[TeamsNotifier] Webhook 回應錯誤: ${response.status} ${response.statusText} — ${responseText}`
      );
      return { success: false, error: `Teams webhook 回應錯誤: ${response.status}` };
    }

    logger.info(
      `[TeamsNotifier] Teams 通知已成功發送，預約編號: ${appointment.appointmentNumber}`
    );
    return { success: true, simulated: false };
  } catch (err) {
    logger.error(`[TeamsNotifier] 發送 Teams 通知時發生錯誤: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  buildAppointmentAdaptiveCard,
  sendTeamsNotification,
  formatDateTime,
};
