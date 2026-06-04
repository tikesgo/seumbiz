import { supabase } from "./supabaseClient.js";

let isSaving = false;
let profileRequestId = 0;

const $ = (selector) => document.querySelector(selector);

const companyNameInput = $("#profileCompanyName");
const managerNameInput = $("#profileManagerName");
const phoneInput = $("#profilePhone");
const kakaoIdInput = $("#profileKakaoId");
const currentPasswordInput = $("#currentPassword");
const newPasswordInput = $("#newPassword");
const confirmPasswordInput = $("#confirmPassword");
const saveButton = $("#profileSaveButton");
const statusElement = $("#profileStatusMessage");
const profileInputs = [companyNameInput, managerNameInput, phoneInput, kakaoIdInput].filter(Boolean);

const setStatus = (message, type = "") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.state = type;
};

const setSaving = (value) => {
  isSaving = value;
  if (!saveButton) return;
  saveButton.disabled = value;
  saveButton.lastChild.textContent = value ? " 저장 중..." : " 변경사항 저장";
};

const getAuthContext = () => window.SEUMBizAuth || null;

const setProfileDisabled = (value) => {
  profileInputs.forEach((input) => {
    if (input !== companyNameInput) {
      input.disabled = value;
    }
  });

  if (saveButton) {
    saveButton.disabled = value || isSaving;
  }
};

const clearProfileInputs = () => {
  profileInputs.forEach((input) => {
    input.value = "";
  });
};

const fillProfile = ({ bizUser, company }) => {
  if (companyNameInput) {
    companyNameInput.value = company?.company_name || "";
  }

  if (managerNameInput) {
    managerNameInput.value = bizUser?.name || company?.manager_name || "";
  }

  if (phoneInput) {
    phoneInput.value = bizUser?.phone || company?.phone || "";
  }

  if (kakaoIdInput) {
    kakaoIdInput.value = company?.kakao_id || "";
  }
};

const loadProfile = async () => {
  const requestId = ++profileRequestId;
  const authContext = getAuthContext();

  clearProfileInputs();
  setProfileDisabled(true);
  setStatus("계정 정보를 불러오는 중입니다.", "");

  if (!authContext?.bizUser?.id || !authContext?.companyId) {
    setStatus("업체 인증 정보를 확인할 수 없습니다.", "error");
    return;
  }

  try {
    const [userResult, companyResult] = await Promise.all([
      supabase
        .from("biz_users")
        .select("id, name, phone")
        .eq("id", authContext.bizUser.id)
        .maybeSingle(),
      supabase
        .from("biz_companies")
        .select("id, company_name, manager_name, phone, kakao_id")
        .eq("id", authContext.companyId)
        .maybeSingle(),
    ]);

    if (requestId !== profileRequestId) return;

    if (userResult.error) throw userResult.error;
    if (companyResult.error) throw companyResult.error;

    if (!userResult.data || !companyResult.data) {
      throw new Error("계정 정보를 찾을 수 없습니다.");
    }

    authContext.bizUser = {
      ...authContext.bizUser,
      ...userResult.data,
    };
    authContext.company = {
      ...authContext.company,
      ...companyResult.data,
    };

    fillProfile({ bizUser: userResult.data, company: companyResult.data });
    setStatus("", "");
    setProfileDisabled(false);
  } catch (error) {
    if (requestId !== profileRequestId) return;
    clearProfileInputs();
    setStatus(error.message || "계정 정보를 불러오지 못했습니다.", "error");
  }
};

const clearPasswordInputs = () => {
  if (currentPasswordInput) currentPasswordInput.value = "";
  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
};

const validatePasswordChange = () => {
  const currentPassword = currentPasswordInput?.value || "";
  const newPassword = newPasswordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";
  const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword);

  if (!hasPasswordInput) {
    return "";
  }

  if (!newPassword || !confirmPassword) {
    return "새 비밀번호와 비밀번호 확인을 모두 입력해주세요.";
  }

  if (newPassword.length < 8) {
    return "새 비밀번호는 8자 이상 입력해주세요.";
  }

  if (newPassword !== confirmPassword) {
    return "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.";
  }

  return "";
};

const updateProfileRows = async () => {
  const authContext = getAuthContext();
  const userId = authContext?.bizUser?.id;
  const companyId = authContext?.companyId;

  if (!userId || !companyId) {
    throw new Error("업체 인증 정보를 확인할 수 없습니다.");
  }

  const managerName = managerNameInput?.value.trim() || "";
  const phone = phoneInput?.value.trim() || "";
  const kakaoId = kakaoIdInput?.value.trim() || null;

  if (!managerName) {
    throw new Error("담당자명을 입력해주세요.");
  }

  if (!phone) {
    throw new Error("연락처를 입력해주세요.");
  }

  const { error: userError } = await supabase
    .from("biz_users")
    .update({
      name: managerName,
      phone,
    })
    .eq("id", userId);

  if (userError) throw userError;

  const { error: companyError } = await supabase
    .from("biz_companies")
    .update({
      manager_name: managerName,
      phone,
      kakao_id: kakaoId,
    })
    .eq("id", companyId);

  if (companyError) throw companyError;

  authContext.bizUser = {
    ...authContext.bizUser,
    name: managerName,
    phone,
  };
  authContext.company = {
    ...authContext.company,
    manager_name: managerName,
    phone,
    kakao_id: kakaoId,
  };
};

const updatePassword = async () => {
  const newPassword = newPasswordInput?.value || "";
  if (!newPassword) return false;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return true;
};

const handleSave = async () => {
  if (isSaving) return;

  if (!supabase) {
    setStatus("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  const passwordError = validatePasswordChange();
  if (passwordError) {
    setStatus(passwordError, "error");
    return;
  }

  setSaving(true);
  setStatus("변경사항을 저장하고 있습니다.", "");

  try {
    await updateProfileRows();
    const passwordChanged = await updatePassword();
    clearPasswordInputs();
    setStatus(passwordChanged ? "정보와 비밀번호가 저장되었습니다." : "정보가 저장되었습니다.", "ok");
  } catch (error) {
    setStatus(error.message || "정보 저장에 실패했습니다.", "error");
  } finally {
    setSaving(false);
  }
};

clearProfileInputs();
setProfileDisabled(true);

saveButton?.addEventListener("click", handleSave);

document.addEventListener("input", (event) => {
  if (event.target.closest(".profile-settings")) {
    setStatus("", "");
  }
});

document.addEventListener("seumbiz:auth-ready", loadProfile);

if (window.SEUMBizAuth?.companyId) {
  loadProfile();
}
