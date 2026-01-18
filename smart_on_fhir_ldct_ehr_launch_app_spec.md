# SMART on FHIR LDCT Lung-RADS v2022 App 開發規格書

> 本文件為 **可直接交付工程師開發** 之技術規格，適用於 **SMART on FHIR – EHR Launch（模式 A）**。
>
> 定位：院內醫師／放射科使用之 **LDCT 肺癌篩檢報告檢視 App**，由 EHR 在「已選定病人情境」下啟動。

---

## 1. 專案目標與範圍

### 1.1 專案目標
- 建置一個 **SMART on FHIR EHR Launch Web App**
- App 啟動後 **自動取得指定病人（patient context）**
- 顯示該病人的：
  - Patient 基本資料
  - LDCT Lung-RADS v2022 檢查報告列表
  - 單一報告的結構化詳細內容

### 1.2 非目標（第一版不做）
- 不提供病人搜尋或病人清單功能
- 不提供報告編輯／寫回功能（read-only）
- 不實作完整國際標準術語（僅最小必要集合）

---

## 2. 系統架構總覽

```
[EHR / HIS]
   │  (SMART EHR Launch)
   ▼
[SMART App (JS Web App)]
   │  (FHIR REST API)
   ▼
[FHIR Server (R4)]
```

- 前端：JavaScript Web App
- 驗證：SMART on FHIR (OAuth 2.0 + OIDC)
- 後端資料來源：FHIR R4 Server

---

## 3. SMART on FHIR 設定規格

### 3.1 Launch 模式
- 模式：**EHR Launch（Patient-scoped）**
- EHR 需於啟動 App 時提供：
  - `iss`（FHIR base URL）
  - `launch`（launch context）

### 3.2 App URLs
| 類型 | URL |
|---|---|
| Launch URL | `/launch.html` |
| Redirect URI | `/app.html` |

### 3.3 OAuth Scopes（最小集合）
```
openid profile
launch
launch/patient
patient/Patient.read
patient/DiagnosticReport.read
patient/Observation.read
patient/ImagingStudy.read
```

---

## 4. 前端頁面與流程

### 4.1 頁面結構

| 頁面 | 功能 |
|---|---|
| launch.html | 接收 EHR launch，執行 OAuth authorize |
| app.html | 病人摘要 + 報告列表 |
| report.html | 單一 LDCT 報告詳細內容 |

---

## 5. FHIR 資料模型設計（R4）

### 5.1 Patient（只讀）

用途：顯示病人基本資料

使用欄位：
- Patient.id
- Patient.name
- Patient.gender
- Patient.birthDate
- Patient.identifier（選用）

---

### 5.2 DiagnosticReport（LDCT 報告主體）

> **1 份 LDCT 報告 = 1 筆 DiagnosticReport**

| 欄位 | 說明 |
|---|---|
| status | `final` |
| category | `imaging` |
| code | LDCT Lung-RADS v2022 報告代碼 |
| subject | Patient/{id} |
| effectiveDateTime | 攝影日期 |
| issued | 判讀日期 |
| performer | 醫院或影像單位 |
| resultsInterpreter | 判讀醫師 |
| result[] | 連結 Observation |
| presentedForm[] | 原始 PDF（選用） |

#### DiagnosticReport.code（自定）
```
System: http://your-org.tw/fhir/CodeSystem/ldct
Code: lung-rads-2022-report
Display: LDCT Lung Cancer Screening Report (Lung-RADS v2022)
```

---

### 5.3 Observation（結構化內容）

#### 5.3.1 報告摘要 Observation（每份報告）

| 項目 | 類型 | 備註 |
|---|---|---|
| LDCT Quality | CodeableConcept | good / acceptable / not-acceptable |
| CTDIvol | Quantity (mGy) | |
| Total DLP | Quantity (mGy*cm) | |
| Lung-RADS Category | CodeableConcept | 0 / 1 / 2 / 3 / 4A / 4B / 4X |
| Modifier S | Boolean | 選用 |
| Recommendation | String | 選用 |

---

#### 5.3.2 肺結節 Observation（最多 3 筆）

> **每顆結節 = 1 筆 Observation**，使用 `component[]`

| component | 型別 |
|---|---|
| entireSizeMm | Quantity (mm) |
| density | CodeableConcept (non-solid / part-solid / solid) |
| solidPartMm | Quantity (mm，僅 part-solid) |
| lobe | CodeableConcept (RUL/RML/RLL/LUL/LLL) |
| status | CodeableConcept (unchanged / enlarging / newly-found / no-prior-ct) |
| SE | string（選用） |
| IM | string（選用） |

---

### 5.4 其他發現（第一版簡化）

- Other lung findings → Observation.valueString
- Other findings → Observation.valueString

---

## 6. FHIR 查詢規格

### 6.1 取得 Patient
```
GET /Patient/{patientId}
```

### 6.2 取得該病人 LDCT 報告列表
```
GET /DiagnosticReport
  ?patient={patientId}
  &category=imaging
  &code=http://your-org.tw/fhir/CodeSystem/ldct|lung-rads-2022-report
  &_sort=-date
```

### 6.3 取得單一報告詳細資料

1. 由 DiagnosticReport.result[] 取得 Observation reference
2. 逐筆讀取 Observation

```
GET /Observation/{id}
```

---

## 7. UI 顯示規格（摘要）

### 7.1 報告列表
- 攝影日期
- Lung-RADS 類別（大字）

### 7.2 報告詳細頁
- Patient 摘要
- 報告基本資料（日期、醫師）
- Lung-RADS Category（強調顯示）
- 劑量資訊
- 肺結節 1~3（卡片式）
- 其他發現（文字）
- 原始 PDF（如有）

---

## 8. 技術限制與假設

- FHIR Server 為 **FHIR R4**
- 本 App 為 **Read-only**
- 不實作 Patient search
- 不實作 user-scoped 存取

---

## 9. 後續可擴充方向（不屬於本版）

- Standalone Patient App
- 寫回 Follow-up Recommendation
- 結構化對應 LOINC / SNOMED / ACR Lung-RADS
- 與 ImagingStudy / DICOM Viewer 整合

---

**文件版本**：v1.0  
**適用對象**：Frontend / Backend / FHIR / HIS 工程師

