/**
 * Unit tests for the Teams Notifier Service (teamsNotifier.js)
 */

const { buildAppointmentAdaptiveCard, formatDateTime } = require("../src/services/teamsNotifier");

const mockAppointment = {
  appointmentNumber: "APT-1234567890-5678",
  orderNumber: "RIS-1234567890-001",
  confirmationCode: "CONF-ABC123",
  mrn: "MRN-001234",
  patientName: "王小明",
  examTypeCode: "CT-CHEST",
  examTypeName: "胸部電腦斷層掃描",
  appointmentDateTime: "2026-04-01T09:00:00.000Z",
  endDateTime: "2026-04-01T09:30:00.000Z",
  room: "CT室-1",
  orderingPhysician: "陳大文 醫師",
  durationMinutes: 30,
  status: "CONFIRMED",
  instructions: [
    "請於預約時間前 15 分鐘抵達放射科報到",
    "請攜帶健保卡及病歷號",
  ],
};

const mockPatient = {
  mrn: "MRN-001234",
  name: "王小明",
  dateOfBirth: "1975-04-12",
  gender: "M",
  department: "胸腔內科",
  attendingPhysician: "陳大文 醫師",
};

describe("teamsNotifier", () => {
  describe("formatDateTime", () => {
    test("formats an ISO string to Traditional Chinese date format", () => {
      const result = formatDateTime("2026-04-01T09:00:00.000Z");
      expect(result).toMatch(/2026/);
      expect(result).toMatch(/04/);
      expect(result).toMatch(/\(/);
      expect(result).toMatch(/\)/);
    });
  });

  describe("buildAppointmentAdaptiveCard", () => {
    test("returns a valid Adaptive Card message object", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      expect(card.type).toBe("message");
      expect(Array.isArray(card.attachments)).toBe(true);
      expect(card.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    });

    test("card content contains patient MRN", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      const cardJson = JSON.stringify(card);
      expect(cardJson).toContain("MRN-001234");
    });

    test("card content contains appointment number", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      const cardJson = JSON.stringify(card);
      expect(cardJson).toContain("APT-1234567890-5678");
    });

    test("card content contains exam type name", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      const cardJson = JSON.stringify(card);
      expect(cardJson).toContain("胸部電腦斷層掃描");
    });

    test("card has Action buttons for viewing and cancelling appointment", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      const actions = card.attachments[0].content.actions;
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThanOrEqual(2);
      const actionTitles = actions.map(a => a.title);
      expect(actionTitles).toContain("查看預約詳情");
      expect(actionTitles).toContain("取消預約");
    });

    test("card contains patient instructions", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      const cardJson = JSON.stringify(card);
      expect(cardJson).toContain("請攜帶健保卡及病歷號");
    });

    test("card schema uses AdaptiveCard version 1.5", () => {
      const card = buildAppointmentAdaptiveCard(mockAppointment, mockPatient);
      expect(card.attachments[0].content.version).toBe("1.5");
      expect(card.attachments[0].content.type).toBe("AdaptiveCard");
    });

    test("female patient shows 女 in the card", () => {
      const femalePatient = { ...mockPatient, gender: "F", name: "李美玲" };
      const card = buildAppointmentAdaptiveCard(mockAppointment, femalePatient);
      const cardJson = JSON.stringify(card);
      expect(cardJson).toContain("女");
    });
  });
});
