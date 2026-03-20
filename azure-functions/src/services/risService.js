/**
 * Simulated Radiology Information System (RIS) Service
 *
 * This service mocks calls to a hospital's RIS to:
 *  - Validate patient identity by medical record number
 *  - Retrieve available CT examination types
 *  - Verify examination orders
 */

/** Simulated patient database */
const MOCK_PATIENTS = {
  "MRN-001234": {
    mrn: "MRN-001234",
    name: "王小明",
    dateOfBirth: "1975-04-12",
    gender: "M",
    phone: "0912-345-678",
    department: "胸腔內科",
    attendingPhysician: "陳大文 醫師",
  },
  "MRN-005678": {
    mrn: "MRN-005678",
    name: "李美玲",
    dateOfBirth: "1982-09-23",
    gender: "F",
    phone: "0923-456-789",
    department: "腫瘤科",
    attendingPhysician: "林志遠 醫師",
  },
  "MRN-009012": {
    mrn: "MRN-009012",
    name: "張建國",
    dateOfBirth: "1968-11-30",
    gender: "M",
    phone: "0934-567-890",
    department: "一般外科",
    attendingPhysician: "黃淑芬 醫師",
  },
};

/** Simulated CT examination types available at the RIS */
const CT_EXAM_TYPES = {
  CT_CHEST: {
    code: "CT-CHEST",
    name: "胸部電腦斷層掃描",
    nameEn: "CT Chest",
    duration: 30,
    preparationRequired: false,
    contrastRequired: false,
    department: "放射科",
    room: "CT室-1",
  },
  CT_CHEST_CONTRAST: {
    code: "CT-CHEST-CON",
    name: "胸部電腦斷層掃描（含顯影劑）",
    nameEn: "CT Chest with Contrast",
    duration: 45,
    preparationRequired: true,
    contrastRequired: true,
    department: "放射科",
    room: "CT室-1",
  },
  CT_ABDOMEN: {
    code: "CT-ABDOMEN",
    name: "腹部電腦斷層掃描",
    nameEn: "CT Abdomen",
    duration: 30,
    preparationRequired: true,
    contrastRequired: false,
    department: "放射科",
    room: "CT室-2",
  },
  CT_ABDOMEN_PELVIS: {
    code: "CT-ABD-PELVIS",
    name: "腹腔及骨盆電腦斷層掃描",
    nameEn: "CT Abdomen & Pelvis",
    duration: 45,
    preparationRequired: true,
    contrastRequired: true,
    department: "放射科",
    room: "CT室-2",
  },
  CT_HEAD: {
    code: "CT-HEAD",
    name: "頭部電腦斷層掃描",
    nameEn: "CT Head",
    duration: 20,
    preparationRequired: false,
    contrastRequired: false,
    department: "放射科",
    room: "CT室-3",
  },
  LOW_DOSE_CT_LUNG: {
    code: "LDCT-LUNG",
    name: "低劑量胸部電腦斷層掃描（肺癌篩檢）",
    nameEn: "Low-Dose CT Lung Screening",
    duration: 20,
    preparationRequired: false,
    contrastRequired: false,
    department: "放射科",
    room: "CT室-1",
  },
};

/**
 * Simulates a call to the RIS to validate a patient by MRN.
 * @param {string} mrn - Medical Record Number
 * @returns {{ success: boolean, patient?: object, error?: string }}
 */
function validatePatient(mrn) {
  const patient = MOCK_PATIENTS[mrn];
  if (!patient) {
    return {
      success: false,
      error: `找不到病歷號 ${mrn} 的病人資料`,
    };
  }
  return { success: true, patient };
}

/**
 * Simulates a call to the RIS to get exam type details.
 * @param {string} examTypeCode - Exam type code (e.g., "CT-CHEST")
 * @returns {{ success: boolean, examType?: object, error?: string }}
 */
function getExamType(examTypeCode) {
  const examType = CT_EXAM_TYPES[examTypeCode] || Object.values(CT_EXAM_TYPES).find(e => e.code === examTypeCode);
  if (!examType) {
    return {
      success: false,
      error: `找不到檢查種類代碼 ${examTypeCode}`,
    };
  }
  return { success: true, examType };
}

/**
 * Simulates creating an exam order in the RIS.
 * @param {string} mrn - Medical Record Number
 * @param {string} examTypeCode - Exam type code
 * @param {string} orderingPhysician - Ordering physician name
 * @param {string} clinicalIndication - Clinical indication / reason for exam
 * @returns {{ success: boolean, orderNumber?: string, error?: string }}
 */
function createExamOrder(mrn, examTypeCode, orderingPhysician, clinicalIndication) {
  const patientResult = validatePatient(mrn);
  if (!patientResult.success) return patientResult;

  const examResult = getExamType(examTypeCode);
  if (!examResult.success) return examResult;

  const orderNumber = `RIS-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

  return {
    success: true,
    orderNumber,
    patient: patientResult.patient,
    examType: examResult.examType,
    orderingPhysician,
    clinicalIndication,
    orderedAt: new Date().toISOString(),
    status: "ORDERED",
  };
}

/**
 * Returns the list of all available CT exam types.
 * @returns {object[]}
 */
function listCTExamTypes() {
  return Object.values(CT_EXAM_TYPES);
}

module.exports = {
  validatePatient,
  getExamType,
  createExamOrder,
  listCTExamTypes,
};
