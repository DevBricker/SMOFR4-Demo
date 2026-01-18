SMART on FHIR LDCT Lung-RADS Demo — 執行與測試教學

需求環境
1) 可提供靜態網站的 HTTP 伺服器（不可用 file:// 直接開啟）
2) 具 SMART on FHIR EHR Launch 的測試環境或 FHIR Sandbox（支援 iss + launch）
3) 已註冊的 SMART App Client ID

專案重點檔案
- launch.html：EHR Launch 入口
- app.html：病人摘要 + 報告清單
- report.html：報告詳情
- js/config.js：SMART App 設定

步驟 1：設定 SMART App 參數
開啟 js/config.js，設定下列欄位：
- clientId：改成你在 EHR/FHIR 平台註冊的 App ID
- redirectUri：保持 /app.html（與註冊的 Redirect URI 一致）
- launchUri：保持 /launch.html
- reportUri：保持 /report.html
- ldctReportCodeSystem / ldctReportCode：需與你 FHIR Server 上的 DiagnosticReport.code 一致

步驟 2：以 HTTP 方式提供專案
用任一靜態網站伺服器把此資料夾掛起來，例如：
- VS Code Live Server
- 任何你習慣的靜態伺服器

確保可以用網址存取，例如：
http://localhost:8080/launch.html

步驟 3：在 EHR/FHIR Sandbox 註冊 App
在你使用的平台註冊 SMART App：
- Launch URL: http://localhost:8080/launch.html
- Redirect URI: http://localhost:8080/app.html
- Scopes: openid profile launch launch/patient patient/Patient.read patient/DiagnosticReport.read patient/Observation.read patient/ImagingStudy.read

步驟 4：從 EHR Launch 啟動
在 EHR 或 Sandbox 內選定病人並 Launch App。
平台會帶入：
- iss（FHIR base URL）
- launch（launch context）

App 會自動完成 OAuth，跳轉到 app.html 並載入病人資料與報告。

步驟 5：查看報告詳情
在 app.html 的報告清單點選任一卡片，會進入 report.html?id=REPORT_ID
系統會讀取該筆 DiagnosticReport 與 result[] 指向的 Observations。

常見問題
1) 看到 Missing launch parameters
- 代表你直接開了 launch.html，但沒有透過 EHR Launch
- 請從 EHR/Sandbox 進行 Launch

2) 看到 Authorization failed
- 檢查 clientId 是否正確
- 檢查 Redirect URI 是否與註冊一致
- 檢查是否用 HTTP 伺服器（不能用 file://）

3) 沒有報告
- 檢查 DiagnosticReport 是否有符合 ldctReportCodeSystem + ldctReportCode
- 確認有影像類別 category=imaging

4) Lung-RADS 顯示 Unknown
- 需有 Observation.code.coding = { system: http://radlex.org, code: RID50134 }
- 且 valueCodeableConcept 有對應分類值

版本
- 日期：2026-01-18
