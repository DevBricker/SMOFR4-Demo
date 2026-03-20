/**
 * Simulated Schedule System Service
 *
 * This service mocks calls to a hospital's scheduling system to:
 *  - Query available CT scanner time slots
 *  - Book an appointment slot
 *  - Cancel or reschedule appointments
 */

/**
 * Returns a list of simulated available time slots for a given exam type.
 * In a real system this would query the scheduling database for open slots.
 *
 * @param {string} examTypeCode - Exam type code (e.g., "CT-CHEST")
 * @param {string} preferredDate - ISO date string (YYYY-MM-DD) for preferred appointment date
 * @param {number} durationMinutes - Duration of the exam in minutes
 * @returns {{ success: boolean, availableSlots?: object[], error?: string }}
 */
function getAvailableSlots(examTypeCode, preferredDate, durationMinutes) {
  const date = new Date(preferredDate);
  if (isNaN(date.getTime())) {
    return { success: false, error: `無效的日期格式: ${preferredDate}` };
  }

  const slots = [];
  const startHour = 8; // 08:00
  const endHour = 17;  // 17:00
  const slotIntervalMinutes = durationMinutes + 10; // buffer between exams

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotIntervalMinutes) {
      if (h * 60 + m + durationMinutes > endHour * 60) break;

      const slotDate = new Date(date);
      slotDate.setHours(h, m, 0, 0);

      // Simulate some slots being unavailable (30% chance)
      const isAvailable = Math.random() > 0.3;
      if (isAvailable) {
        const slotId = `SLOT-${examTypeCode}-${slotDate.toISOString().replace(/[:.]/g, "-")}`;
        slots.push({
          slotId,
          examTypeCode,
          startTime: slotDate.toISOString(),
          endTime: new Date(slotDate.getTime() + durationMinutes * 60000).toISOString(),
          available: true,
        });
      }
    }
  }

  if (slots.length === 0) {
    return {
      success: false,
      error: `${preferredDate} 當日無可用時段，請選擇其他日期`,
    };
  }

  return { success: true, availableSlots: slots };
}

/**
 * Simulates booking an appointment in the scheduling system.
 *
 * @param {object} params - Booking parameters
 * @param {string} params.orderNumber - RIS order number
 * @param {string} params.mrn - Medical Record Number
 * @param {string} params.patientName - Patient's full name
 * @param {string} params.examTypeCode - Exam type code
 * @param {string} params.examTypeName - Human-readable exam type name
 * @param {string} params.appointmentDateTime - ISO datetime for the appointment
 * @param {string} params.room - CT room assignment
 * @param {string} params.orderingPhysician - Name of ordering physician
 * @param {number} params.durationMinutes - Expected exam duration
 * @returns {{ success: boolean, appointment?: object, error?: string }}
 */
function bookAppointment(params) {
  const {
    orderNumber,
    mrn,
    patientName,
    examTypeCode,
    examTypeName,
    appointmentDateTime,
    room,
    orderingPhysician,
    durationMinutes,
  } = params;

  const appointmentTime = new Date(appointmentDateTime);
  if (isNaN(appointmentTime.getTime())) {
    return { success: false, error: `無效的預約時間格式: ${appointmentDateTime}` };
  }

  const hour = appointmentTime.getHours();
  if (hour < 8 || hour >= 17) {
    return {
      success: false,
      error: `預約時間 ${appointmentDateTime} 超出門診時間（08:00–17:00）`,
    };
  }

  const appointmentNumber = `APT-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const endTime = new Date(appointmentTime.getTime() + durationMinutes * 60000);

  const appointment = {
    appointmentNumber,
    orderNumber,
    mrn,
    patientName,
    examTypeCode,
    examTypeName,
    appointmentDateTime: appointmentTime.toISOString(),
    endDateTime: endTime.toISOString(),
    room,
    orderingPhysician,
    durationMinutes,
    status: "CONFIRMED",
    confirmationCode: `CONF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    reminderSent: false,
    instructions: buildPreparationInstructions(examTypeCode),
  };

  return { success: true, appointment };
}

/**
 * Returns preparation instructions for the patient based on the exam type.
 * @param {string} examTypeCode
 * @returns {string[]}
 */
function buildPreparationInstructions(examTypeCode) {
  const baseInstructions = [
    "請於預約時間前 15 分鐘抵達放射科報到",
    "請攜帶健保卡及病歷號",
  ];

  const contrastExams = ["CT-CHEST-CON", "CT-ABD-PELVIS"];
  const fastingExams = ["CT-ABDOMEN", "CT-ABD-PELVIS"];

  if (contrastExams.includes(examTypeCode)) {
    baseInstructions.push("檢查前需評估腎功能（抽血檢驗肌酸酐）");
    baseInstructions.push("若有顯影劑過敏史，請事先告知醫護人員");
  }

  if (fastingExams.includes(examTypeCode)) {
    baseInstructions.push("檢查前 4 小時請禁食（可喝少量開水）");
  }

  if (examTypeCode === "LDCT-LUNG") {
    baseInstructions.push("本次為低劑量胸部掃描，輻射量極低，可安心接受");
    baseInstructions.push("請穿著寬鬆衣物，並去除胸部金屬飾物");
  }

  return baseInstructions;
}

/**
 * Simulates cancelling an appointment.
 * @param {string} appointmentNumber - Appointment number to cancel
 * @returns {{ success: boolean, message?: string, error?: string }}
 */
function cancelAppointment(appointmentNumber) {
  if (!appointmentNumber || !appointmentNumber.startsWith("APT-")) {
    return { success: false, error: `無效的預約編號: ${appointmentNumber}` };
  }
  return {
    success: true,
    message: `預約 ${appointmentNumber} 已成功取消`,
    cancelledAt: new Date().toISOString(),
  };
}

module.exports = {
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
};
