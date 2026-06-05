const PIN_16_PATTERN = /^\d{16}$/;
export const ZXING_MODULE_URL = "https://esm.sh/@zxing/browser@0.1.5";
const MAX_IMAGE_EDGE = 1280;

let zxingModulePromise = null;

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

export const extract16DigitPin = (raw) => {
  const digits = normalizeDigits(raw);
  if (PIN_16_PATTERN.test(digits)) return digits;

  const match = digits.match(/\d{16}/);
  return match ? match[0] : null;
};

const loadZxingModule = async () => {
  zxingModulePromise ??= import(ZXING_MODULE_URL);
  return zxingModulePromise;
};

const ensureImageLoaded = (image) =>
  new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve(image);
      return;
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
  });

const createImageElementFromCanvas = async (canvas) => {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  const image = new Image();
  image.src = dataUrl;
  return ensureImageLoaded(image);
};

const createResizedCanvas = (sourceImage) => {
  let width = sourceImage.naturalWidth || sourceImage.width;
  let height = sourceImage.naturalHeight || sourceImage.height;

  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
    const scale = MAX_IMAGE_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas를 사용할 수 없습니다.");
  context.drawImage(sourceImage, 0, 0, width, height);
  return canvas;
};

const loadFileImageResources = async (file) => {
  const objectUrl = URL.createObjectURL(file);
  const loadStartedAt = performance.now();

  const sourceImage = new Image();
  sourceImage.src = objectUrl;
  await ensureImageLoaded(sourceImage);

  const canvas = createResizedCanvas(sourceImage);
  const decodeImage = await createImageElementFromCanvas(canvas);
  const imageLoadMs = Math.round(performance.now() - loadStartedAt);

  return { sourceImage, decodeImage, canvas, objectUrl, imageLoadMs };
};

const isZxingNotFound = (error) => {
  const name = String(error?.name || "");
  const message = String(error?.message || "");
  return name === "NotFoundException" || /not\s*found/i.test(message);
};

const isZxingInputError = (error) => {
  const message = String(error?.message || "");
  return /imageElement|imageSource|Couldn't get image/i.test(message);
};

const decodeWithBarcodeDetector = async (canvas) => {
  const startedAt = performance.now();
  const trace = {
    supported: "BarcodeDetector" in window,
    barcodeDetectorResult: null,
    barcodeDetectorError: "",
    elapsedMs: 0,
  };

  if (!trace.supported) {
    trace.barcodeDetectorError = "BarcodeDetector 미지원";
    trace.elapsedMs = Math.round(performance.now() - startedAt);
    return trace;
  }

  const formatCandidates = [
    "qr_code",
    "code_128",
    "code_39",
    "ean_13",
    "ean_8",
    "itf",
    "pdf417",
    "data_matrix",
    "aztec",
  ];

  try {
    let detector;
    try {
      detector = new BarcodeDetector({ formats: formatCandidates });
    } catch {
      detector = new BarcodeDetector();
    }

    const barcodes = await detector.detect(canvas);
    if (barcodes?.length) {
      trace.barcodeDetectorResult = barcodes[0].rawValue || "";
    }
  } catch (error) {
    trace.barcodeDetectorError = `BarcodeDetector: ${error?.message || String(error)}`;
  }

  trace.elapsedMs = Math.round(performance.now() - startedAt);
  return trace;
};

const decodeWithZxing = async ({ decodeImage, objectUrl }) => {
  const startedAt = performance.now();
  const trace = {
    readerType: "BrowserMultiFormatReader",
    zxingResult: null,
    zxingError: "",
    zxingStatus: "not_run",
    elapsedMs: 0,
  };

  try {
    const zxingModule = await loadZxingModule();
    const ReaderClass = zxingModule.BrowserMultiFormatReader;
    trace.readerType = ReaderClass?.name || "BrowserMultiFormatReader";

    if (!ReaderClass) {
      trace.zxingStatus = "error";
      trace.zxingError = "ZXing: BrowserMultiFormatReader export 없음";
      return trace;
    }

    const reader = new ReaderClass();
    await ensureImageLoaded(decodeImage);

    const applyDecodeResult = (result) => {
      const text = result?.getText?.() || result?.text || "";
      if (text) {
        trace.zxingResult = text;
        trace.zxingStatus = "decoded";
      } else {
        trace.zxingStatus = "not_found";
      }
    };

    const handleDecodeError = (error) => {
      if (isZxingNotFound(error)) {
        trace.zxingStatus = "not_found";
        trace.zxingError = "";
        return;
      }

      if (isZxingInputError(error)) {
        trace.zxingStatus = "input_error";
        trace.zxingError = `ZXing 입력 오류: ${error?.message || String(error)}`;
        return;
      }

      trace.zxingStatus = "error";
      trace.zxingError = `ZXing: ${error?.message || String(error)}`;
    };

    if (typeof reader.decodeFromImageElement === "function") {
      try {
        const result = await reader.decodeFromImageElement(decodeImage);
        applyDecodeResult(result);
        return trace;
      } catch (error) {
        if (!isZxingInputError(error)) {
          handleDecodeError(error);
          return trace;
        }
      }
    }

    if (typeof reader.decodeFromImageUrl === "function" && objectUrl) {
      try {
        const result = await reader.decodeFromImageUrl(objectUrl);
        applyDecodeResult(result);
        return trace;
      } catch (error) {
        handleDecodeError(error);
        return trace;
      }
    }

    trace.zxingStatus = "input_error";
    trace.zxingError = "ZXing 입력 오류: decodeFromImageElement/decodeFromImageUrl 미지원";
  } catch (error) {
    if (isZxingNotFound(error)) {
      trace.zxingStatus = "not_found";
    } else if (isZxingInputError(error)) {
      trace.zxingStatus = "input_error";
      trace.zxingError = `ZXing 입력 오류: ${error?.message || String(error)}`;
    } else {
      trace.zxingStatus = "error";
      trace.zxingError = `ZXing: ${error?.message || String(error)}`;
    }
  } finally {
    trace.elapsedMs = Math.round(performance.now() - startedAt);
  }

  return trace;
};

export const scanBarcodeFromFile = async (file) => {
  const row = {
    fileName: file?.name || "unknown",
    pin16: null,
    rawValue: "",
    decodePath: "",
    zxingStatus: "not_run",
    barcodeFound: false,
    elapsedMs: 0,
    imageLoadMs: 0,
    detectorMs: 0,
    zxingMs: 0,
    error: "",
  };

  let objectUrl = null;

  try {
    const resources = await loadFileImageResources(file);
    objectUrl = resources.objectUrl;
    row.imageLoadMs = resources.imageLoadMs;

    const detectorTrace = await decodeWithBarcodeDetector(resources.canvas);
    row.detectorMs = detectorTrace.elapsedMs;

    let decoded = detectorTrace.barcodeDetectorResult || null;
    if (decoded) {
      row.decodePath = "barcode_detector";
      row.rawValue = decoded;
      row.zxingStatus = "skipped";
    }

    if (!decoded) {
      const zxingTrace = await decodeWithZxing({
        decodeImage: resources.decodeImage,
        objectUrl: resources.objectUrl,
      });
      row.zxingMs = zxingTrace.elapsedMs;
      row.zxingStatus = zxingTrace.zxingStatus;

      if (zxingTrace.zxingResult) {
        decoded = zxingTrace.zxingResult;
        row.decodePath = "barcode_zxing";
        row.rawValue = decoded;
      }
    }

    if (decoded) {
      row.barcodeFound = true;
      row.pin16 = extract16DigitPin(decoded);
    }
  } catch (error) {
    row.error = String(error?.message || error);
    console.error("[SEUMBiz OCR Barcode Scan] scan failed", row.fileName, error);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  row.elapsedMs = row.imageLoadMs + row.detectorMs + row.zxingMs;
  return row;
};

export const scanBarcodeFromFiles = async (files, options = {}) => {
  const list = Array.from(files || []);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  let completed = 0;

  const results = await Promise.all(
    list.map(async (file) => {
      const result = await scanBarcodeFromFile(file);
      completed += 1;
      if (onProgress) {
        onProgress({ completed, total: list.length, fileName: result.fileName });
      }
      return result;
    }),
  );

  return new Map(list.map((file, index) => [file, results[index]]));
};

export const scanResultToOcrItem = (file, scanResult) => {
  const imageName = file?.name || scanResult?.fileName || "unknown";
  const pin16 = scanResult?.pin16 || null;

  if (!pin16) return null;

  return {
    image_name: imageName,
    pin_no: pin16,
    face_value: null,
    confidence: null,
    warning: "",
    raw_text: scanResult.rawValue || "",
    failed: false,
    error_type: "amount_missing",
    decode_path: scanResult.decodePath || "barcode_zxing",
    barcode_elapsed_ms: scanResult.elapsedMs ?? null,
  };
};
