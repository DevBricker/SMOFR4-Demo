/**
 * ctAppointment Azure Function
 *
 * HTTP-triggered Azure Function (Node.js v4 programming model) that simulates
 * a hospital CT imaging appointment booking workflow:
 *
 *  1. Validates the patient in the simulated RIS
 *  2. Creates an exam order in the simulated RIS
 *  3. Queries available time slots from the simulated Schedule System
 *  4. Books the appointment in the simulated Schedule System
 *  5. Sends a confirmation Adaptive Card to Microsoft Teams
 *
 * POST /api/ct-appointment
 * Body:
 * {
 *   "mrn": "MRN-001234",
 *   "examTypeCode": "CT-CHEST",
 *   "appointmentDateTime": "2026-03-25T09:00:00",
 *   "orderingPhysician": "陳大文 醫師",
 *   "clinicalIndication": "肺結節追蹤"
 * }
 *
 * GET /api/ct-appointment/exam-types
 *   Returns the list of available CT exam types.
 *
 * GET /api/ct-appointment/available-slots?examTypeCode=CT-CHEST&preferredDate=2026-03-25&duration=30
 *   Returns available time slots for the given exam type and preferred date.
 */

const { app } = require("@azure/functions");
const risService = require("../services/risService");
const scheduleService = require("../services/scheduleService");
const { sendTeamsNotification } = require("../services/teamsNotifier");

// ---------------------------------------------------------------------------
// POST /api/ct-appointment  — Book a CT appointment
// ---------------------------------------------------------------------------
app.http("createCTAppointment", {
  methods: ["POST"],
  authLevel: "function",
  route: "ct-appointment",
  handler: async (request, context) => {
    context.log("📥 收到 CT 預約請求");

    let body;
    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { success: false, error: "無效的 JSON 請求內容" },
      };
    }

    const { mrn, examTypeCode, appointmentDateTime, orderingPhysician, clinicalIndication } = body || {};

    // --- Input validation ---
    const missing = [];
    if (!mrn) missing.push("mrn");
    if (!examTypeCode) missing.push("examTypeCode");
    if (!appointmentDateTime) missing.push("appointmentDateTime");
    if (!orderingPhysician) missing.push("orderingPhysician");

    if (missing.length > 0) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: `缺少必要欄位: ${missing.join(", ")}`,
        },
      };
    }

    context.log(`  病歷號: ${mrn} | 檢查: ${examTypeCode} | 時間: ${appointmentDateTime}`);

    // --- Step 1: Validate patient in RIS ---
    context.log("🔍 Step 1: 呼叫 RIS 驗證病人資料...");
    const patientResult = risService.validatePatient(mrn);
    if (!patientResult.success) {
      context.warn(`  RIS 病人驗證失敗: ${patientResult.error}`);
      return {
        status: 404,
        jsonBody: { success: false, step: "RIS_PATIENT_VALIDATION", error: patientResult.error },
      };
    }
    context.log(`  ✅ 病人驗證成功: ${patientResult.patient.name}`);

    // --- Step 2: Create exam order in RIS ---
    context.log("📋 Step 2: 呼叫 RIS 建立影像檢查醫囑...");
    const orderResult = risService.createExamOrder(
      mrn,
      examTypeCode,
      orderingPhysician,
      clinicalIndication || "AI 輔助診斷後預約"
    );
    if (!orderResult.success) {
      context.warn(`  RIS 醫囑建立失敗: ${orderResult.error}`);
      return {
        status: 400,
        jsonBody: { success: false, step: "RIS_CREATE_ORDER", error: orderResult.error },
      };
    }
    context.log(`  ✅ RIS 醫囑建立成功: ${orderResult.orderNumber}`);

    // --- Step 3: Book appointment in Schedule System ---
    context.log("📅 Step 3: 呼叫排程系統進行預約...");
    const bookingResult = scheduleService.bookAppointment({
      orderNumber: orderResult.orderNumber,
      mrn,
      patientName: patientResult.patient.name,
      examTypeCode: orderResult.examType.code,
      examTypeName: orderResult.examType.name,
      appointmentDateTime,
      room: orderResult.examType.room,
      orderingPhysician,
      durationMinutes: orderResult.examType.duration,
    });

    if (!bookingResult.success) {
      context.warn(`  排程系統預約失敗: ${bookingResult.error}`);
      return {
        status: 409,
        jsonBody: { success: false, step: "SCHEDULE_BOOK", error: bookingResult.error },
      };
    }
    context.log(`  ✅ 預約成功: ${bookingResult.appointment.appointmentNumber}`);

    // --- Step 4: Send Teams Adaptive Card notification ---
    context.log("📣 Step 4: 發送 Teams Adaptive Card 通知...");
    const notifyResult = await sendTeamsNotification(
      bookingResult.appointment,
      patientResult.patient,
      context
    );

    if (!notifyResult.success) {
      context.warn(`  Teams 通知發送失敗: ${notifyResult.error}`);
      // Not a fatal error — appointment is still confirmed
    } else if (notifyResult.simulated) {
      context.log("  ℹ️  Teams 通知已模擬（未設定 Webhook URL）");
    } else {
      context.log("  ✅ Teams 通知已成功發送");
    }

    // --- Return the complete result ---
    return {
      status: 201,
      jsonBody: {
        success: true,
        message: "CT 影像檢查預約完成",
        appointment: bookingResult.appointment,
        patient: patientResult.patient,
        order: {
          orderNumber: orderResult.orderNumber,
          orderedAt: orderResult.orderedAt,
          clinicalIndication: orderResult.clinicalIndication,
        },
        teamsNotification: {
          sent: notifyResult.success,
          simulated: notifyResult.simulated || false,
        },
      },
    };
  },
});

// ---------------------------------------------------------------------------
// GET /api/ct-appointment/exam-types  — List available CT exam types
// ---------------------------------------------------------------------------
app.http("listCTExamTypes", {
  methods: ["GET"],
  authLevel: "function",
  route: "ct-appointment/exam-types",
  handler: async (_request, context) => {
    context.log("📋 查詢可用 CT 檢查種類");
    const examTypes = risService.listCTExamTypes();
    return {
      status: 200,
      jsonBody: {
        success: true,
        count: examTypes.length,
        examTypes,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// GET /api/ct-appointment/available-slots  — Query available time slots
// ---------------------------------------------------------------------------
app.http("getAvailableSlots", {
  methods: ["GET"],
  authLevel: "function",
  route: "ct-appointment/available-slots",
  handler: async (request, context) => {
    const examTypeCode = request.query.get("examTypeCode");
    const preferredDate = request.query.get("preferredDate");
    const duration = parseInt(request.query.get("duration") || "30", 10);

    context.log(`📅 查詢可用時段: examTypeCode=${examTypeCode}, preferredDate=${preferredDate}`);

    if (!examTypeCode || !preferredDate) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "缺少必要參數: examTypeCode, preferredDate",
        },
      };
    }

    const slotsResult = scheduleService.getAvailableSlots(examTypeCode, preferredDate, duration);
    if (!slotsResult.success) {
      return {
        status: 404,
        jsonBody: { success: false, error: slotsResult.error },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        examTypeCode,
        preferredDate,
        count: slotsResult.availableSlots.length,
        availableSlots: slotsResult.availableSlots,
      },
    };
  },
});
