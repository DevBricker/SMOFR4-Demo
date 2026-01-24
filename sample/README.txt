LDCT Lung-RADS 測試資料（Postman 用）

順序
方式 A：一次 POST Bundle（建議）
1) POST 00_bundle_transaction.json 到 [base]
2) POST 02_bundle_transaction_full_fields.json 到 [base]（含所有結節欄位、自動 ID）

方式 B：逐筆 POST/PUT
1) POST 01_patient.json
2) POST 02_diagnosticreport.json
3) POST 03_obs_lung_rads.json
4) POST 04_obs_nodule_presence.json
5) POST 05_obs_nodule1.json
6) POST 06_obs_ctdivol.json
7) POST 07_obs_dlp.json
8) PUT 08_update_diagnosticreport_result.json

說明
- 若伺服器要求 Bundle，請用 00_bundle_transaction.json。
- 先把每個檔案中的 {{PATIENT_ID}} / {{DIAGNOSTIC_REPORT_ID}} / {{OBS_*_ID}} 替換成實際回傳的 id。
- DiagnosticReport 先建立，等 Observation 建完再 PUT 更新 result[]。
- Lung-RADS assessment 使用 RadLex RID50134（valueCodeableConcept 為分類值）。
- CTDIvol / DLP 使用 DICOM DCM 113830 / 113813。
- Pulmonary nodule 使用 SNOMED 786838002。
