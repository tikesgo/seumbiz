import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const form = document.querySelector("[data-vendor-form]");
const messageBox = document.querySelector("[data-vendor-message]");

const successMessage = "업체 매입 문의가 정상 접수되었습니다.";

function getFormValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function showMessage(message, type) {
  if (!messageBox) return;

  messageBox.hidden = false;
  messageBox.textContent = message;
  messageBox.classList.remove("is-success", "is-error");
  messageBox.classList.add(type === "success" ? "is-success" : "is-error");
}

function clearMessage() {
  if (!messageBox) return;

  messageBox.hidden = true;
  messageBox.textContent = "";
  messageBox.classList.remove("is-success", "is-error");
}

function createPayload(formData) {
  return {
    company_name: getFormValue(formData, "companyName"),
    manager_name: getFormValue(formData, "managerName"),
    phone: getFormValue(formData, "phone"),
    email: getFormValue(formData, "email") || null,
    giftcard_type: getFormValue(formData, "productName") || null,
    monthly_volume: getFormValue(formData, "monthlyVolume") || null,
    message: getFormValue(formData, "message") || null,
    privacy_agreed: formData.get("privacyAgreement") === "on",
    status: "\uB300\uAE30",
  };
}

function validatePayload(payload) {
  const missingFields = [];

  if (!payload.company_name) missingFields.push("업체명");
  if (!payload.manager_name) missingFields.push("담당자명");
  if (!payload.phone) missingFields.push("휴대폰 번호");
  if (!payload.privacy_agreed) missingFields.push("개인정보 동의");

  return missingFields;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!form) return;
  clearMessage();

  if (!hasSupabaseConfig || !supabase) {
    showMessage("저장 환경 설정을 확인해주세요.", "error");
    return;
  }

  const submitButton = form.querySelector(".vendor-submit-button");
  const payload = createPayload(new FormData(form));
  const missingFields = validatePayload(payload);

  if (missingFields.length > 0) {
    showMessage(`${missingFields.join(", ")} 항목을 확인해주세요.`, "error");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "접수 중입니다";
  }

  try {
    const { error } = await supabase.from("vendor_inquiries").insert(payload);

    if (error) {
      throw error;
    }

    form.reset();
    showMessage(successMessage, "success");
  } catch (error) {
    console.error("[vendor] inquiry insert failed:", error);
    showMessage(error?.message || "문의 접수 중 오류가 발생했습니다.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "대량매입 문의 보내기";
    }
  }
}

form?.addEventListener("submit", handleSubmit);
