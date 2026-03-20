/**
 * Unit tests for the RIS Service (risService.js)
 */

const risService = require("../src/services/risService");

describe("risService", () => {
  describe("validatePatient", () => {
    test("returns patient data for a valid MRN", () => {
      const result = risService.validatePatient("MRN-001234");
      expect(result.success).toBe(true);
      expect(result.patient).toBeDefined();
      expect(result.patient.mrn).toBe("MRN-001234");
      expect(result.patient.name).toBe("王小明");
    });

    test("returns error for an unknown MRN", () => {
      const result = risService.validatePatient("MRN-UNKNOWN");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/MRN-UNKNOWN/);
    });
  });

  describe("getExamType", () => {
    test("returns exam type for a valid code key", () => {
      const result = risService.getExamType("CT_CHEST");
      expect(result.success).toBe(true);
      expect(result.examType.code).toBe("CT-CHEST");
    });

    test("returns exam type when using the code value directly", () => {
      const result = risService.getExamType("CT-CHEST");
      expect(result.success).toBe(true);
      expect(result.examType.name).toContain("胸部");
    });

    test("returns error for an unknown exam type", () => {
      const result = risService.getExamType("CT-UNKNOWN");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/CT-UNKNOWN/);
    });
  });

  describe("createExamOrder", () => {
    test("creates an exam order for a valid patient and exam type", () => {
      const result = risService.createExamOrder(
        "MRN-001234",
        "CT-CHEST",
        "陳大文 醫師",
        "肺結節追蹤"
      );
      expect(result.success).toBe(true);
      expect(result.orderNumber).toMatch(/^RIS-/);
      expect(result.patient.mrn).toBe("MRN-001234");
      expect(result.examType.code).toBe("CT-CHEST");
      expect(result.status).toBe("ORDERED");
    });

    test("fails for an unknown patient", () => {
      const result = risService.createExamOrder(
        "MRN-INVALID",
        "CT-CHEST",
        "陳大文 醫師",
        "追蹤"
      );
      expect(result.success).toBe(false);
    });

    test("fails for an unknown exam type", () => {
      const result = risService.createExamOrder(
        "MRN-001234",
        "CT-NONEXISTENT",
        "陳大文 醫師",
        "追蹤"
      );
      expect(result.success).toBe(false);
    });
  });

  describe("listCTExamTypes", () => {
    test("returns an array of exam types", () => {
      const types = risService.listCTExamTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      types.forEach(t => {
        expect(t).toHaveProperty("code");
        expect(t).toHaveProperty("name");
        expect(t).toHaveProperty("duration");
      });
    });
  });
});
