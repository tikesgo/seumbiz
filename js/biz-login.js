import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const ALLOWED_COMPANY_ROLES = new Set(["company_owner", "company_staff", "company_user"]);
const DASHBOARD_PATH = "/biz-dashboard.html";

const $ = (id) => document.getElementById(id);

const form = $("bizLoginForm");
const loginIdInput = $("bizLoginId");
const passwordInput = $("bizLoginPassword");
const submitButton = $("bizLoginSubmit");
const statusElement = $("bizLoginStatus");
let isLoggingIn = false;

const setStatus = (message, type = "") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.state = type;
};

const setLoading = (isLoading) => {
  isLoggingIn = isLoading;
  if (!submitButton) return;
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "로그인 확인 중..." : "로그인";
};

const getRedirectPath = () => {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  return DASHBOARD_PATH;
};

const signOutSilently = async () => {
  try {
    await supabase?.auth.signOut();
  } catch (error) {
    console.warn(error);
  }
};

const getApprovedBizContext = async (authUserId) => {
  const { data: bizUser, error: userError } = await supabase
    .from("biz_users")
    .select("id, auth_user_id, company_id, login_id, name, role, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (userError) {
    throw new Error("업체 계정 정보를 확인할 수 없습니다.");
  }

  if (!bizUser) {
    throw new Error("등록된 업체 계정이 없습니다.");
  }

  if (bizUser.role === "admin") {
    throw new Error("관리자 계정은 업체 화면에 접근할 수 없습니다.");
  }

  if (bizUser.status === "pending") {
    throw new Error("업체 등록 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다.");
  }

  if (bizUser.status !== "approved") {
    throw new Error("승인되지 않은 업체 계정입니다. 관리자에게 문의해주세요.");
  }

  if (!ALLOWED_COMPANY_ROLES.has(bizUser.role)) {
    throw new Error("업체 화면 접근 권한이 없습니다.");
  }

  if (!bizUser.company_id) {
    throw new Error("업체 정보가 연결되지 않은 계정입니다.");
  }

  const { data: company, error: companyError } = await supabase
    .from("biz_companies")
    .select("id, status")
    .eq("id", bizUser.company_id)
    .maybeSingle();

  if (companyError) {
    throw new Error("업체 승인 상태를 확인할 수 없습니다.");
  }

  if (company?.status === "pending") {
    throw new Error("업체 등록 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다.");
  }

  if (!company || company.status !== "approved") {
    throw new Error("업체 승인이 완료되지 않았습니다. 관리자에게 문의해주세요.");
  }

  return { bizUser, company };
};

const redirectIfAlreadyApproved = async () => {
  if (!hasSupabaseConfig || !supabase) {
    setStatus("로그인 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.", "error");
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return;
  }

  try {
    await getApprovedBizContext(data.session.user.id);
    window.location.replace(getRedirectPath());
  } catch (error) {
    await signOutSilently();
    setStatus(error.message, "error");
  }
};

const handleLogin = async (event) => {
  event?.preventDefault();

  if (isLoggingIn) {
    return;
  }

  if (!hasSupabaseConfig || !supabase) {
    setStatus("로그인 서비스를 사용할 수 없습니다. 관리자에게 문의해주세요.", "error");
    return;
  }

  const email = loginIdInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setStatus("이메일과 비밀번호를 입력해주세요.", "error");
    return;
  }

  setLoading(true);
  setStatus("로그인 정보를 확인하고 있습니다.", "");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data?.user || !data?.session) {
      throw new Error("로그인 세션을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    await getApprovedBizContext(data.user.id);
    setStatus("로그인되었습니다. 대시보드로 이동합니다.", "ok");
    window.location.href = getRedirectPath();
  } catch (error) {
    await signOutSilently();
    setStatus(error.message || "로그인에 실패했습니다.", "error");
  } finally {
    setLoading(false);
  }
};

form?.addEventListener("submit", handleLogin);
redirectIfAlreadyApproved();
