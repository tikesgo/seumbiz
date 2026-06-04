import { hasSupabaseConfig, supabase } from "./supabaseClient.js";
import { getSeumBizAdminAssetBaseUrl } from "./biz-assets.js";

const form = document.querySelector("#bizSignupForm");
const submitButton = document.querySelector("#bizSignupSubmit");
const statusElement = document.querySelector("#bizSignupStatus");

const fields = {
  company: document.querySelector("#signupCompany"),
  manager: document.querySelector("#signupManager"),
  phone: document.querySelector("#signupPhone"),
  kakao: document.querySelector("#signupKakao"),
  email: document.querySelector("#signupLoginId"),
  password: document.querySelector("#signupPassword"),
  passwordConfirm: document.querySelector("#signupPasswordConfirm")
};

let isSubmitting = false;

const setStatus = (message, state = "") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.state = state;
};

const setLoading = (loading) => {
  isSubmitting = loading;
  if (!submitButton) return;
  submitButton.disabled = loading;
  submitButton.textContent = loading ? "신청 접수 중" : "업체 등록 신청";
};

const getValue = (input) => String(input?.value || "").trim();

const validateSignup = (payload) => {
  if (!payload.company_name) return "업체명을 입력해주세요.";
  if (!payload.manager_name) return "담당자명을 입력해주세요.";
  if (!payload.phone) return "연락처를 입력해주세요.";
  if (!payload.kakao_id) return "카카오톡 ID를 입력해주세요.";
  if (!payload.email) return "이메일을 입력해주세요.";
  if (!payload.password) return "비밀번호를 입력해주세요.";
  if (payload.password.length < 8) return "비밀번호는 8자 이상 입력해주세요.";
  if (payload.password !== payload.password_confirm) return "비밀번호 확인이 일치하지 않습니다.";
  return "";
};

const createPendingCompanyAccount = async ({ session, payload }) => {
  const response = await fetch(`${getSeumBizAdminAssetBaseUrl()}/api/seumbiz/company-signup`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      company_name: payload.company_name,
      manager_name: payload.manager_name,
      phone: payload.phone,
      kakao_id: payload.kakao_id,
      login_id: payload.email
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.detail || `HTTP ${response.status}`);
  }

  return data;
};

const handleSignup = async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  if (!hasSupabaseConfig || !supabase) {
    setStatus("Supabase 설정을 확인해주세요.", "error");
    return;
  }

  const payload = {
    company_name: getValue(fields.company),
    manager_name: getValue(fields.manager),
    phone: getValue(fields.phone),
    kakao_id: getValue(fields.kakao),
    email: getValue(fields.email).toLowerCase(),
    password: fields.password?.value || "",
    password_confirm: fields.passwordConfirm?.value || ""
  };
  const validationMessage = validateSignup(payload);
  if (validationMessage) {
    setStatus(validationMessage, "error");
    return;
  }

  setLoading(true);
  setStatus("Auth 계정을 생성하고 업체 등록 신청을 저장하고 있습니다.", "");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          company_name: payload.company_name,
          name: payload.manager_name,
          phone: payload.phone,
          kakao_id: payload.kakao_id
        }
      }
    });

    if (error) throw error;

    let session = data?.session || null;
    if (!session) {
      const sessionResult = await supabase.auth.getSession();
      session = sessionResult.data?.session || null;
    }

    if (!data?.user || !session?.access_token) {
      throw new Error("Auth 세션이 생성되지 않았습니다. 이메일 인증 설정을 확인한 뒤 다시 신청해주세요.");
    }

    await createPendingCompanyAccount({ session, payload });
    await supabase.auth.signOut();
    form?.reset();
    setStatus("업체 등록 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.", "ok");
  } catch (error) {
    console.error("[SEUMBiz signup] signup failed:", error);
    setStatus(error.message || "업체 등록 신청에 실패했습니다.", "error");
  } finally {
    setLoading(false);
  }
};

form?.addEventListener("submit", handleSignup);
