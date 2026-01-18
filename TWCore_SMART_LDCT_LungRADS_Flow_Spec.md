
# TW Core + SMART on FHIR（EHR Launch）— LDCT Lung-RADS 報告資料建置與查詢流程（含正確 Code/System 範例）

> 目標：符合 **TW Core IG v1.0.0（FHIR R4）** 的 Resource 建置與查詢流程，並用 **SMART on FHIR（EHR launch）** 的方式，讓醫院端開啟 App 後直接在指定病人（patient context）下讀取：
> 1) `Patient`  
> 2) 1 份影像報告：`DiagnosticReport`（imaging）  
> 3) 報告結構中的重點欄位：以多筆 `Observation` 表達（必要時用 `hasMember`/`result` 串起來）

## 0. 先講清楚「不要自編」的 Code/System 策略

TW Core IG 的資源 Profiles/查詢能力與術語架構可從官方 artifacts 索引查到（含 DiagnosticReport/Observation 的 search parameters 與 profiles）。citeturn6view0

本文件對「Lung-RADS category、肺結節、劑量資訊」採用下列 **國際既有** code systems（非自編）：

1) **Lung-RADS 分類**：使用 **RadLex RID**（Lung-RADS 在多份實作/指南中以 RadLex RID 表達）。citeturn5search0turn5search5  
2) **肺結節（Pulmonary nodule）**：使用 **SNOMED CT**（例如 786838002）。citeturn4search18  
3) **CT 劑量（CTDIvol / DLP）**：使用 **DICOM CT dose terminology（CodeSystem: DCM）**；例如 **113830 Mean CTDIvol**、**113813 CT Dose Length Product Total**。citeturn7view0  

> 為什麼不用硬找 LOINC？  
> Lung-RADS 這類放射分級在實務上常用 RadLex；CT dose 常用 DICOM SR/CT dose 的 DCM codes。這些都屬於國際標準 code system，且可在 FHIR `Coding.system` 以 URI 正確標示。citeturn7view0turn5search5

---

## 1) 新增 Patient（POSTMAN：FHIR REST create）

### 1.1 Endpoint
`POST [base]/Patient`

### 1.2 範例 JSON（最小可用）
> 你可依 TW Core Patient profile 需求補必填欄位；此處示範測試用。

```json
{
  "resourceType": "Patient",
  "identifier": [
    {
      "system": "https://example.org/tw/identifier/national-id",
      "value": "A123456789"
    }
  ],
  "name": [
    {
      "use": "official",
      "text": "王小明"
    }
  ],
  "gender": "male",
  "birthDate": "1970-01-01"
}
```

回傳會得到 `id`（例如 `Patient/123`）。

---

## 2) 建立 LDCT 報告（POSTMAN：先 DiagnosticReport，再 Observations）

### 2.1 先建 DiagnosticReport（影像報告主檔）

#### Endpoint
`POST [base]/DiagnosticReport`

#### DiagnosticReport.code（建議用 LOINC「影像報告類型」）
此處 **code** 是「報告類型」而非 Lung-RADS；建議用 LOINC 的「CT chest」/「Radiology report」類型（實務上可選你院內既定代碼並以 `identifier` 補充）。  
> 若你們已經有院內報告代碼系統（例如 RIS code），也可以在 code 中以 `Coding.system` 指向你們的官方 code system URI。

#### 範例 JSON（先不填 result，等 Observation 建完再補）
```json
{
  "resourceType": "DiagnosticReport",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
          "code": "RAD",
          "display": "Radiology"
        }
      ]
    }
  ],
  "code": {
    "text": "LDCT Lung Cancer Screening Report"
  },
  "subject": {
    "reference": "Patient/123"
  },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "issued": "2026-01-18T12:00:00+08:00",
  "conclusion": "See Observations for structured Lung-RADS and nodule details."
}
```

> DiagnosticReport.category 用 v2-0074 的 RAD（Radiology）是常見做法；TW Core 也支援影像報告情境（可依你們 IG profile 限制調整）。citeturn6view0

---

### 2.2 建 Observations（報告欄位的結構化重點）

下面示範你提到的「選一些重點」：  
- Lung-RADS category（必做）  
- 肺結節是否存在 + 最懷疑結節 1（必做）  
- CTDIvol、Total DLP（必做）  
- LDCT Quality（可做）  
- 其他肺部發現（示範 1 個：Emphysema，可做）

> 資料設計原則：  
> - **每個重點欄位 = 1 筆 Observation**（或 1 筆 Observation + components）  
> - 由 `DiagnosticReport.result[]` 指到這些 Observations（或用 `Observation.hasMember` 做 panel）  
> - Observation.code / valueCodeableConcept / valueQuantity 的 **system、code、display** 都使用既有標準（RadLex / SNOMED CT / DICOM DCM 等）。

---

#### 2.2.1 Observation：Lung-RADS category（RadLex RID）

##### Endpoint
`POST [base]/Observation`

##### Coding（RadLex）
- Lung-RADS assessment（RadLex：RID50134）  
- 分類值（RadLex：RID50135～RID50140 等）citeturn5search5turn5search0

##### 範例 JSON（以 Category 2 為例）
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://radlex.org",
        "code": "RID50134",
        "display": "Lung-RADS assessment"
      }
    ]
  },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "valueCodeableConcept": {
    "coding": [
      {
        "system": "http://radlex.org",
        "code": "RID50137",
        "display": "Lung-RADS 2"
      }
    ],
    "text": "Lung-RADS v2022 Category 2"
  }
}
```

> 注意：RadLex 的 RID 在不同內容中會以 RID50135=0、RID50136=1、RID50137=2、RID50138=3... 這樣對應描述。請以你採用的 RadLex/RID 清單為準（不要自行改動 RID 對應）。citeturn5search0turn5search5

---

#### 2.2.2 Observation：是否有肺結節（SNOMED CT Finding）

如果你只要「有/沒有肺結節」：可用一筆 Observation 表達 finding presence。  
（有結節時，另建「最懷疑結節 1」那筆 Observation）

##### SNOMED CT：Pulmonary nodule 786838002citeturn4search18

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "786838002",
        "display": "Pulmonary nodule"
      }
    ],
    "text": "Pulmonary nodule presence"
  },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "valueBoolean": true
}
```

---

#### 2.2.3 Observation：最懷疑結節 1（大小/密度/肺葉）— 用 components（示範）

> 這筆是「結節 1 的結構化描述」。  
> - code：用 SNOMED CT 的「pulmonary nodule」作為主題（或用你們選定的標準 code 表示 “Lung nodule #1” panel）  
> - components：size、density、lobe、status…（你可以只挑重點 component 做）

⚠️ 這裡牽涉到更多術語（例如各肺葉、密度分類），建議你先把「要做的 component 清單」固定，再逐一挑選對應的 SNOMED CT（或其他既有 code system）。

（本文件先給 **可跑通流程** 的骨架範例，肺葉/密度值你們可分批補齊。）

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "786838002",
        "display": "Pulmonary nodule"
      }
    ],
    "text": "Most suspicious lung nodule #1"
  },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "component": [
    {
      "code": {
        "text": "Entire nodule size"
      },
      "valueQuantity": {
        "value": 7.2,
        "unit": "mm",
        "system": "http://unitsofmeasure.org",
        "code": "mm"
      }
    },
    {
      "code": { "text": "Density" },
      "valueString": "part-solid"
    },
    {
      "code": { "text": "Lobe" },
      "valueString": "RUL"
    },
    {
      "code": { "text": "Status" },
      "valueString": "unchanged"
    }
  ]
}
```

> 上面 component 先用 text 讓工程可先做出資料流。  
> 你要求「System/Code/Display 不要自編」：  
> **若要把每個 component 都 fully-coded（SNOMED/LOINC/RadLex…）**，我建議你先選 5–10 個你最在意的欄位（例如：size、solid/part-solid/ground-glass、lobe、growth）我再逐一替你對應標準術語，避免一次做太大。

---

#### 2.2.4 Observation：CTDIvol / Total DLP（DICOM DCM codes）

DICOM Supplement 155 的 CT dose codes：  
- **113830 Mean CTDIvol**  
- **113813 CT Dose Length Product Total**citeturn7view0

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "113830",
        "display": "Mean CTDIvol"
      }
    ]
  },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "valueQuantity": {
    "value": 1.2,
    "unit": "mGy",
    "system": "http://unitsofmeasure.org",
    "code": "mGy"
  }
}
```

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "imaging",
          "display": "Imaging"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://dicom.nema.org/resources/ontology/DCM",
        "code": "113813",
        "display": "CT Dose Length Product Total"
      }
    ]
  },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "valueQuantity": {
    "value": 42.0,
    "unit": "mGy*cm",
    "system": "http://unitsofmeasure.org",
    "code": "mGy.cm"
  }
}
```

---

### 2.3 把 Observation 掛回 DiagnosticReport.result

假設你剛剛 POST Observation 後拿到：
- Lung-RADS：`Observation/obs-lr`  
- Nodule presence：`Observation/obs-nod-pres`  
- Nodule #1：`Observation/obs-nod-1`  
- CTDIvol：`Observation/obs-ctdi`  
- DLP：`Observation/obs-dlp`

你可以用 `PUT [base]/DiagnosticReport/{id}` 更新 `result`：

```json
{
  "resourceType": "DiagnosticReport",
  "id": "dr-ldct-001",
  "status": "final",
  "category": [
    {
      "coding": [
        { "system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "RAD", "display": "Radiology" }
      ]
    }
  ],
  "code": { "text": "LDCT Lung Cancer Screening Report" },
  "subject": { "reference": "Patient/123" },
  "effectiveDateTime": "2026-01-18T10:30:00+08:00",
  "issued": "2026-01-18T12:00:00+08:00",
  "result": [
    { "reference": "Observation/obs-lr" },
    { "reference": "Observation/obs-nod-pres" },
    { "reference": "Observation/obs-nod-1" },
    { "reference": "Observation/obs-ctdi" },
    { "reference": "Observation/obs-dlp" }
  ]
}
```

---

## 3) EHR Launch（OAuth2 + OpenID Connect）— App 端要做什麼

你是 **EHR launch**（不是 standalone patient app），所以流程特徵是：  
- EHR 會用瀏覽器把使用者導到你的 app：`https://yourapp/launch?iss=...&launch=...`
- 你用 SMART client-js 依規範做 `authorize()`，完成後會拿到：
  - access token（用來 call FHIR API）
  - patient context（`client.patient.id`）  
  - user（`fhirUser`）等 OIDC claims

SMART client-js 規範與用法請以官方文件為準。citeturn0search0

### 3.1 建議 scopes（以「只能讀」為主）
```text
launch/patient openid fhirUser profile
patient/Patient.read
patient/DiagnosticReport.read
patient/Observation.read
```

> 如果你需要抓「病人清單」：通常是 practitioner context（launch/provider）或系統層級權限；  
> 但你這次決定「預設開啟指定病人」，那就先用 launch/patient 把 MVP 做到能跑通。

---

## 4) SMART APP：查詢 Patient Resource

### 4.1 JS（SMART client-js）最小可用範例
> 以 EHR launch 進來後，直接讀取當下 patient。

```js
import FHIR from "fhirclient";

FHIR.oauth2.ready().then(async (client) => {
  // 1) 取得 patient id（EHR context）
  const patientId = client.patient.id;

  // 2) 讀 Patient
  const patient = await client.request(`Patient/${patientId}`);

  console.log("Patient", patient);
}).catch(console.error);
```

---

## 5) SMART APP：查詢 DiagnosticReport + Observation（組出報告）

### 5.1 查 DiagnosticReport（imaging 類別）
```js
const patientId = client.patient.id;

const drBundle = await client.request(
  `DiagnosticReport?subject=Patient/${patientId}&category=RAD&_sort=-date&_count=10`
);

// 取最新一筆
const dr = drBundle.entry?.[0]?.resource;
```

> `category=RAD` 的寫法取決於你們伺服器如何支援 search param；TW Core 的 DiagnosticReport search parameters 可在 artifacts 索引中查。citeturn6view0

### 5.2 取得 DiagnosticReport.result 指到的 Observations
```js
const obsRefs = (dr.result || []).map(r => r.reference); // e.g. "Observation/obs-lr"
const observations = await Promise.all(obsRefs.map(ref => client.request(ref)));

// 你可以用 observations 依 code.system+code 去分類：
// - RadLex RID50134 -> Lung-RADS
// - SNOMED 786838002 -> pulmonary nodule presence / nodule detail
// - DCM 113830 -> CTDIvol
// - DCM 113813 -> DLP
```

---

## 你接下來最需要我補齊的部分（建議優先順序）

你已經說「不要全部都做 terminology，選一些重點」，我建議下一步我們把「**你真的要落地的欄位**」定為 8~12 個，然後我逐一幫你挑到：
- `Observation.code`（用哪個系統：SNOMED / LOINC / RadLex / DICOM DCM）
- `value[x]` 的型別（boolean / CodeableConcept / Quantity / string）
- 若是 CodeableConcept：`system + code + display`（全都引用既有標準）

你只要回我：
- 你「必做」欄位清單（例如：Lung-RADS category、LDCT Quality、No nodule / Benign / <6mm / >=6mm、結節 1 的 size/solid part、lobe、growth、Overall recommendation…）  
我就能把 component/text 先前那段改成 fully-coded（不自編）。
