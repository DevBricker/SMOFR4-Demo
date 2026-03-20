/**
 * Unit tests for the Schedule Service (scheduleService.js)
 */

const scheduleService = require("../src/services/scheduleService");

describe("scheduleService", () => {
  describe("getAvailableSlots", () => {
    test("returns available slots for a valid date", () => {
      const result = scheduleService.getAvailableSlots("CT-CHEST", "2026-04-01", 30);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.availableSlots)).toBe(true);
    });

    test("returns an error for an invalid date format", () => {
      const result = scheduleService.getAvailableSlots("CT-CHEST", "not-a-date", 30);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not-a-date/);
    });
  });

  describe("bookAppointment", () => {
    const validParams = {
      orderNumber: "RIS-1234567890-001",
      mrn: "MRN-001234",
      patientName: "王小明",
      examTypeCode: "CT-CHEST",
      examTypeName: "胸部電腦斷層掃描",
      appointmentDateTime: "2026-04-01T09:00:00",
      room: "CT室-1",
      orderingPhysician: "陳大文 醫師",
      durationMinutes: 30,
    };

    test("successfully books an appointment with valid parameters", () => {
      const result = scheduleService.bookAppointment(validParams);
      expect(result.success).toBe(true);
      expect(result.appointment).toBeDefined();
      expect(result.appointment.appointmentNumber).toMatch(/^APT-/);
      expect(result.appointment.confirmationCode).toMatch(/^CONF-/);
      expect(result.appointment.status).toBe("CONFIRMED");
      expect(result.appointment.mrn).toBe("MRN-001234");
      expect(Array.isArray(result.appointment.instructions)).toBe(true);
    });

    test("sets the correct end time based on duration", () => {
      const result = scheduleService.bookAppointment(validParams);
      const start = new Date(result.appointment.appointmentDateTime);
      const end = new Date(result.appointment.endDateTime);
      const diffMinutes = (end - start) / 60000;
      expect(diffMinutes).toBe(30);
    });

    test("rejects an appointment outside of working hours (before 08:00)", () => {
      const result = scheduleService.bookAppointment({
        ...validParams,
        appointmentDateTime: "2026-04-01T06:00:00",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/08:00/);
    });

    test("rejects an appointment outside of working hours (after 17:00)", () => {
      const result = scheduleService.bookAppointment({
        ...validParams,
        appointmentDateTime: "2026-04-01T18:00:00",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/17:00/);
    });

    test("returns error for invalid datetime format", () => {
      const result = scheduleService.bookAppointment({
        ...validParams,
        appointmentDateTime: "invalid-date",
      });
      expect(result.success).toBe(false);
    });

    test("includes contrast preparation instructions for contrast exams", () => {
      const result = scheduleService.bookAppointment({
        ...validParams,
        examTypeCode: "CT-CHEST-CON",
      });
      expect(result.success).toBe(true);
      const instructions = result.appointment.instructions.join(" ");
      expect(instructions).toMatch(/顯影劑/);
    });

    test("includes fasting instructions for abdomen exams", () => {
      const result = scheduleService.bookAppointment({
        ...validParams,
        examTypeCode: "CT-ABDOMEN",
      });
      expect(result.success).toBe(true);
      const instructions = result.appointment.instructions.join(" ");
      expect(instructions).toMatch(/禁食/);
    });
  });

  describe("cancelAppointment", () => {
    test("successfully cancels a valid appointment number", () => {
      const result = scheduleService.cancelAppointment("APT-1234567890-5678");
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/APT-1234567890-5678/);
    });

    test("returns error for an invalid appointment number", () => {
      const result = scheduleService.cancelAppointment("INVALID-NUMBER");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/INVALID-NUMBER/);
    });
  });
});
