# CT Appointment Azure Functions Service

This folder contains an **Azure Functions** project (Node.js v4 programming model) that simulates a hospital CT imaging appointment booking workflow with **Microsoft Teams Adaptive Card** notifications.

## 功能說明 / Overview

The service simulates the following in-hospital workflow:

```
AI Agent                RIS (模擬)        Schedule (模擬)    Teams
   |                       |                   |               |
   |-- POST /ct-appointment→|                   |               |
   |   (mrn, examType,     |                   |               |
   |    dateTime, doctor)   |                   |               |
   |                       |                   |               |
   |      驗證病歷號         |                   |               |
   |←── patient data ──────|                   |               |
   |                       |                   |               |
   |      建立影像醫囑        |                   |               |
   |←── orderNumber ───────|                   |               |
   |                                           |               |
   |──────────── 預約 CT 時段 ─────────────────→|               |
   |←─────────── appointmentNumber ────────────|               |
   |                                                           |
   |──────────── 發送 Adaptive Card 通知 ─────────────────────→|
   |                                                           |
   |←── 201 Created (預約確認) ─────────────────────────────── |
```

## 架構 / Project Structure

```
azure-functions/
├── src/
│   ├── functions/
│   │   └── ctAppointment.js       # Azure Function 主體 (3 個端點)
│   └── services/
│       ├── risService.js           # 模擬 RIS 放射資訊系統
│       ├── scheduleService.js      # 模擬排程預約系統
│       └── teamsNotifier.js        # Teams Adaptive Card 通知
├── tests/
│   ├── risService.test.js
│   ├── scheduleService.test.js
│   └── teamsNotifier.test.js
├── host.json
├── package.json
├── local.settings.json.example     # 設定範本 (不含機密)
└── .gitignore
```

## API 端點 / Endpoints

### 1. `POST /api/ct-appointment` — 建立 CT 預約

**Request Body:**
```json
{
  "mrn": "MRN-001234",
  "examTypeCode": "CT-CHEST",
  "appointmentDateTime": "2026-03-25T09:00:00",
  "orderingPhysician": "陳大文 醫師",
  "clinicalIndication": "肺結節追蹤"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "CT 影像檢查預約完成",
  "appointment": {
    "appointmentNumber": "APT-...",
    "confirmationCode": "CONF-...",
    "examTypeName": "胸部電腦斷層掃描",
    "appointmentDateTime": "2026-03-25T09:00:00.000Z",
    "room": "CT室-1",
    "status": "CONFIRMED",
    "instructions": ["..."]
  },
  "patient": {
    "mrn": "MRN-001234",
    "name": "王小明",
    "department": "胸腔內科"
  },
  "teamsNotification": {
    "sent": true,
    "simulated": true
  }
}
```

### 2. `GET /api/ct-appointment/exam-types` — 查詢可用 CT 檢查種類

Returns all available CT examination types registered in the simulated RIS.

### 3. `GET /api/ct-appointment/available-slots` — 查詢可用時段

Query params: `examTypeCode`, `preferredDate` (YYYY-MM-DD), `duration` (minutes)

## 模擬資料 / Simulated Data

### 病人 / Patients (RIS)

| 病歷號 | 姓名 | 科別 |
|--------|------|------|
| `MRN-001234` | 王小明 | 胸腔內科 |
| `MRN-005678` | 李美玲 | 腫瘤科 |
| `MRN-009012` | 張建國 | 一般外科 |

### CT 檢查種類 / CT Exam Types

| 代碼 | 名稱 | 時長 |
|------|------|------|
| `CT-CHEST` | 胸部電腦斷層掃描 | 30 min |
| `CT-CHEST-CON` | 胸部CT（含顯影劑） | 45 min |
| `CT-ABDOMEN` | 腹部電腦斷層掃描 | 30 min |
| `CT-ABD-PELVIS` | 腹腔及骨盆CT | 45 min |
| `CT-HEAD` | 頭部電腦斷層掃描 | 20 min |
| `LDCT-LUNG` | 低劑量胸部CT（肺癌篩檢）| 20 min |

## Teams Adaptive Card

When an appointment is confirmed, the function sends an **Adaptive Card** (v1.5) to a Microsoft Teams channel via an Incoming Webhook. The card includes:

- ✅ Confirmation header with appointment & order numbers
- 👤 Patient information (MRN, name, department, physician)
- 🔬 Exam details (type, time, room, duration)
- 📋 Patient preparation instructions
- Action buttons: **View Appointment** | **Cancel Appointment**

Reference: https://learn.microsoft.com/zh-tw/adaptive-cards/

## 設定 / Configuration

Copy `local.settings.json.example` to `local.settings.json` and fill in the values:

```bash
cp local.settings.json.example local.settings.json
```

| 設定項目 | 說明 |
|----------|------|
| `TEAMS_WEBHOOK_URL` | Teams 頻道 Incoming Webhook URL。若未設定，通知改為模擬模式（在 log 輸出 Adaptive Card 內容）。 |
| `RIS_API_BASE_URL` | 模擬 RIS 的 base URL（目前不使用，供未來真實串接） |
| `SCHEDULE_API_BASE_URL` | 模擬排程系統的 base URL（目前不使用，供未來真實串接） |

### 取得 Teams Incoming Webhook URL

1. 在 Teams 頻道 → 右鍵 → **Connectors**
2. 搜尋 **Incoming Webhook** → Configure
3. 複製產生的 Webhook URL 填入 `TEAMS_WEBHOOK_URL`

## 本機執行 / Local Development

```bash
# 安裝相依套件
cd azure-functions
npm install

# 複製設定
cp local.settings.json.example local.settings.json
# 編輯 local.settings.json，填入 TEAMS_WEBHOOK_URL（可選）

# 啟動 Azure Functions 本機執行環境
npm start
# 或
func start
```

Functions 啟動後可使用下列指令測試：

```bash
# 建立 CT 預約
curl -X POST http://localhost:7071/api/ct-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "mrn": "MRN-001234",
    "examTypeCode": "CT-CHEST",
    "appointmentDateTime": "2026-04-01T09:00:00",
    "orderingPhysician": "陳大文 醫師",
    "clinicalIndication": "肺結節追蹤"
  }'

# 查詢檢查種類
curl http://localhost:7071/api/ct-appointment/exam-types

# 查詢可用時段
curl "http://localhost:7071/api/ct-appointment/available-slots?examTypeCode=CT-CHEST&preferredDate=2026-04-01&duration=30"
```

## 測試 / Tests

```bash
cd azure-functions
npm install
npm test
```

## 部署 / Deployment

```bash
# 使用 Azure Functions Core Tools 部署
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>

# 或透過 Azure CLI
az functionapp deployment source config-zip \
  --resource-group <RG> \
  --name <FUNCTION_APP_NAME> \
  --src <zip_file>
```

需求環境：
- Node.js >= 18
- Azure Functions Core Tools v4
- Azure Functions Runtime v4 (Node.js)
