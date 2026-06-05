import { scanBarcodeFromFile } from "./ocr-barcode-scan.js";

const MAX_FILES = 10;

const $ = (selector) => document.querySelector(selector);

const fileInput = $("#pocImages");
const runButton = $("#runPocButton");
const statusEl = $("#pocStatus");
const resultsBody = $("#pocResultsBody");
const summaryEl = $("#pocSummary");
const gateEl = $("#pocGate");

const setStatus = (message, state = "") => {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.state = state;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const scanResultToPocRow = (scanResult) => {
  const decodedValue = scanResult.pin16 || "";
  const is16DigitPin = Boolean(scanResult.pin16);
  const row = {
    fileName: scanResult.fileName,
    barcodeFound: scanResult.barcodeFound,
    decodedValue,
    is16DigitPin,
    elapsedMs: scanResult.elapsedMs,
    imageLoadMs: scanResult.imageLoadMs,
    detectorMs: scanResult.detectorMs,
    zxingMs: scanResult.zxingMs,
    error: scanResult.error || "",
    decodeSource: scanResult.decodePath || "",
    barcodeDetectorResult: scanResult.decodePath === "barcode_detector" ? scanResult.rawValue : null,
    barcodeDetectorError: "",
    zxingResult: scanResult.decodePath === "barcode_zxing" ? scanResult.rawValue : null,
    zxingError: "",
    zxingStatus: scanResult.zxingStatus,
    zxingReaderType: "",
  };

  if (!row.barcodeFound) {
    const messages = [];
    if (row.zxingStatus === "input_error") {
      messages.push("ZXing 입력 오류");
    } else if (row.zxingStatus === "error") {
      messages.push("ZXing 오류");
    } else if (row.zxingStatus === "not_found") {
      messages.push("ZXing: 바코드 미검출");
    }
    if (!messages.length) {
      messages.push("BarcodeDetector/ZXing 모두 미검출");
    }
    row.error = messages.join(" · ");
  }

  console.log("[SEUMBiz OCR Barcode PoC]", {
    fileName: row.fileName,
    imageLoadMs: row.imageLoadMs,
    detectorMs: row.detectorMs,
    zxingMs: row.zxingMs,
    decodeSource: row.decodeSource || null,
    pin16: row.is16DigitPin,
    zxingStatus: row.zxingStatus,
  });

  return row;
};

const evaluateGate = (pin16Count, totalImages) => {
  if (pin16Count >= 7) {
    return {
      label: `PASS — PIN 16자리 ${pin16Count}/${totalImages} (≥7). 바코드 단독 방식 Go 검토.`,
      state: "pass",
    };
  }
  if (pin16Count <= 3) {
    return {
      label: `HOLD — PIN 16자리 ${pin16Count}/${totalImages} (≤3). 바코드 단독 보류, crop+OCR PoC 권장.`,
      state: "hold",
    };
  }
  return {
    label: `REVIEW — PIN 16자리 ${pin16Count}/${totalImages}. 추가 샘플 또는 ZXing/촬영 조건 검토.`,
    state: "review",
  };
};

const renderResults = (rows, summary) => {
  if (resultsBody) {
    resultsBody.innerHTML = rows
      .map(
        (row) => `
        <tr class="${row.is16DigitPin ? "is-pass" : row.barcodeFound ? "is-review" : "is-fail"}">
          <td>${escapeHtml(row.fileName)}</td>
          <td>${row.barcodeFound ? "Y" : "N"}</td>
          <td>${escapeHtml(row.decodeSource || "-")}</td>
          <td><code>${escapeHtml(row.barcodeDetectorResult || "-")}</code></td>
          <td><code>${escapeHtml(row.zxingResult || "-")}</code></td>
          <td><code>${escapeHtml(row.decodedValue || "-")}</code></td>
          <td>${row.is16DigitPin ? "Y" : "N"}</td>
          <td>${row.elapsedMs.toLocaleString("ko-KR")}ms</td>
          <td>${escapeHtml(row.error || "-")}</td>
        </tr>
      `,
      )
      .join("");
  }

  if (summaryEl) {
    summaryEl.innerHTML = `
      <dl class="poc-summary-grid">
        <div><dt>totalImages</dt><dd>${summary.totalImages}</dd></div>
        <div><dt>barcodeDetectorSuccessCount</dt><dd>${summary.barcodeDetectorSuccessCount}</dd></div>
        <div><dt>zxingSuccessCount</dt><dd>${summary.zxingSuccessCount}</dd></div>
        <div><dt>zxingNotFoundCount</dt><dd>${summary.zxingNotFoundCount}</dd></div>
        <div><dt>zxingInputErrorCount</dt><dd>${summary.zxingInputErrorCount}</dd></div>
        <div><dt>decodedCount</dt><dd>${summary.decodedCount}</dd></div>
        <div><dt>pin16Count</dt><dd>${summary.pin16Count}</dd></div>
        <div><dt>totalElapsedMs</dt><dd>${summary.totalElapsedMs.toLocaleString("ko-KR")}ms (${(summary.totalElapsedMs / 1000).toFixed(2)}초)</dd></div>
      </dl>
    `;
  }

  if (gateEl) {
    const gate = evaluateGate(summary.pin16Count, summary.totalImages);
    gateEl.textContent = gate.label;
    gateEl.dataset.state = gate.state;
  }

  console.log("[SEUMBiz OCR Barcode PoC] summary", summary);
};

const getSelectedFiles = () => Array.from(fileInput?.files || []);

const handleRunPoc = async () => {
  const files = getSelectedFiles();
  if (!files.length) {
    setStatus("스캔할 이미지를 선택해주세요.", "error");
    return;
  }
  if (files.length > MAX_FILES) {
    setStatus(`이 PoC는 최대 ${MAX_FILES}장까지 지원합니다.`, "error");
    return;
  }

  runButton.disabled = true;
  setStatus(`${files.length}장 병렬 스캔 중...`, "");

  const totalStartedAt = performance.now();
  try {
    const scanResults = await Promise.all(files.map((file) => scanBarcodeFromFile(file)));
    const rows = scanResults.map((scanResult) => scanResultToPocRow(scanResult));
    const summary = {
      totalImages: files.length,
      barcodeDetectorSuccessCount: rows.filter((row) => row.decodeSource === "barcode_detector").length,
      zxingSuccessCount: rows.filter((row) => row.decodeSource === "barcode_zxing").length,
      zxingNotFoundCount: rows.filter((row) => row.zxingStatus === "not_found").length,
      zxingInputErrorCount: rows.filter((row) => row.zxingStatus === "input_error").length,
      decodedCount: rows.filter((row) => row.barcodeFound).length,
      pin16Count: rows.filter((row) => row.is16DigitPin).length,
      totalElapsedMs: Math.round(performance.now() - totalStartedAt),
    };

    renderResults(rows, summary);
    setStatus(
      `스캔 완료. Detector ${summary.barcodeDetectorSuccessCount} · ZXing ${summary.zxingSuccessCount} · 미검출 ${summary.zxingNotFoundCount} · 입력오류 ${summary.zxingInputErrorCount} · PIN16 ${summary.pin16Count}/${summary.totalImages}`,
      "ok",
    );
  } catch (error) {
    console.error("OCR barcode PoC failed", error);
    setStatus(`스캔 실패: ${error?.message || String(error)}`, "error");
  } finally {
    runButton.disabled = false;
  }
};

runButton?.addEventListener("click", handleRunPoc);
