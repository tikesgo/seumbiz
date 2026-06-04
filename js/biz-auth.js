import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const ALLOWED_COMPANY_ROLES = new Set(["company_owner", "company_staff", "company_user"]);
const LOGIN_PATH = "/biz-login.html";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("ko-KR")}원`;
};

const redirectToLogin = (reason) => {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const url = new URL(LOGIN_PATH, window.location.origin);
  url.searchParams.set("redirect", currentPath);

  if (reason) {
    url.searchParams.set("reason", reason);
  }

  window.location.replace(url.toString());
};

const setText = (selector, text) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = text;
  });
};

const clearLegacyAccountCache = () => {
  const legacyValues = ["3,82" + "0,000", "3,80" + "0,000", "tikes" + "go"];

  try {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      if (!storage) return;

      Object.keys(storage).forEach((key) => {
        const value = storage.getItem(key) || "";
        if (legacyValues.some((legacy) => value.includes(legacy))) {
          storage.removeItem(key);
        }
      });
    });
  } catch (error) {
    console.warn(error);
  }
};

const clearSeumBizLoginStorage = () => {
  const preserveKeys = new Set(["supabase_url", "supabase_anon_key"]);
  const authKeyPatterns = [/^sb-.+-auth-token$/, /seumbiz/i, /auth/i];

  try {
    [window.localStorage, window.sessionStorage].forEach((storage) => {
      if (!storage) return;

      Object.keys(storage).forEach((key) => {
        if (preserveKeys.has(key)) return;
        if (authKeyPatterns.some((pattern) => pattern.test(key))) {
          storage.removeItem(key);
        }
      });
    });
  } catch (error) {
    console.warn(error);
  }
};

const getDisplayUserName = ({ bizUser, authUser, companyName }) =>
  bizUser?.name || bizUser?.login_id || authUser?.email || companyName || "확인 필요";

const setAccountPlaceholder = () => {
  document.querySelectorAll("[data-biz-account]").forEach((account) => {
    account.classList.add("is-loading");
    account.classList.remove("is-loaded");
  });

  document.querySelectorAll("[data-biz-user-chip]").forEach((chip) => {
    const initial = chip.querySelector("[data-biz-user-initial]");
    const name = chip.querySelector("[data-biz-account-user-name]");
    const suffix = chip.querySelector("[data-biz-user-suffix]");

    if (initial) initial.textContent = "";
    if (name) name.textContent = "";
    if (suffix) suffix.textContent = "";
  });

  document.querySelectorAll("[data-biz-balance-chip]").forEach((chip) => {
    const label = chip.querySelector("[data-biz-balance-label]");
    const balance = chip.querySelector("[data-biz-account-balance]");

    if (label) label.textContent = "";
    if (balance) balance.textContent = "";
  });

  setText("[data-biz-user-name]", "");
  setText("[data-biz-company-name]", "불러오는 중");
  setText("[data-biz-balance]", "-");
};

const setAccountHeader = ({ authUser, bizUser, companyName, balanceAmount }) => {
  const displayName = getDisplayUserName({ authUser, bizUser, companyName });
  const initial = displayName.trim().charAt(0).toUpperCase() || "-";

  document.querySelectorAll("[data-biz-user-chip]").forEach((chip) => {
    const initialElement = chip.querySelector("[data-biz-user-initial]");
    const nameElement = chip.querySelector("[data-biz-account-user-name]");
    const suffixElement = chip.querySelector("[data-biz-user-suffix]");

    if (initialElement) initialElement.textContent = initial;
    if (nameElement) nameElement.textContent = displayName;
    if (suffixElement) suffixElement.textContent = "님";
  });

  document.querySelectorAll("[data-biz-balance-chip]").forEach((chip) => {
    const label = chip.querySelector("[data-biz-balance-label]");
    const balance = chip.querySelector("[data-biz-account-balance]");

    if (label) label.textContent = "업체 잔액";
    if (balance) balance.textContent = formatCurrency(balanceAmount);
  });

  document.querySelectorAll("[data-biz-account]").forEach((account) => {
    account.classList.remove("is-loading");
    account.classList.add("is-loaded");
  });

  setText("[data-biz-user-name]", displayName);
  setText("[data-biz-company-name]", companyName);
  setText("[data-biz-balance]", formatCurrency(balanceAmount));
};

const loadCompanyBalance = async (companyId) => {
  const { data, error } = await supabase
    .from("biz_company_balances")
    .select("company_id, company_name, balance_amount")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const loadCompany = async (companyId) => {
  const { data, error } = await supabase
    .from("biz_companies")
    .select("id, company_name, status")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const bindLogoutButtons = () => {
  document.querySelectorAll("[data-biz-logout], .biz-logout-button").forEach((button) => {
    if (button.dataset.logoutBound === "true") return;

    button.dataset.logoutBound = "true";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn(error);
      } finally {
        clearSeumBizLoginStorage();
        window.SEUMBizAuth = null;
        window.location.replace(LOGIN_PATH);
      }
    });
  });
};

export const requireBizAuth = async () => {
  clearLegacyAccountCache();
  setAccountPlaceholder();

  if (!hasSupabaseConfig || !supabase) {
    console.error("Supabase 설정이 없습니다.");
    redirectToLogin("missing_config");
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.user) {
    redirectToLogin("login_required");
    return null;
  }

  const authUser = sessionData.session.user;
  const { data: bizUser, error: userError } = await supabase
    .from("biz_users")
    .select("id, auth_user_id, company_id, login_id, name, role, status")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error(userError);
    redirectToLogin("user_lookup_failed");
    return null;
  }

  if (!bizUser || bizUser.status !== "approved" || !ALLOWED_COMPANY_ROLES.has(bizUser.role)) {
    redirectToLogin("not_approved");
    return null;
  }

  if (!bizUser.company_id) {
    redirectToLogin("missing_company");
    return null;
  }

  const company = await loadCompany(bizUser.company_id);

  if (!company || company.status !== "approved") {
    redirectToLogin("company_not_approved");
    return null;
  }

  let balance = null;
  try {
    balance = await loadCompanyBalance(bizUser.company_id);
  } catch (error) {
    console.error(error);
  }

  const companyName = balance?.company_name || company.company_name || bizUser.name || bizUser.login_id || "확인 필요";
  const balanceAmount = balance?.balance_amount ?? null;
  const context = {
    authUser,
    bizUser,
    company,
    companyId: bizUser.company_id,
    companyName,
    balanceAmount,
  };

  window.SEUMBizAuth = context;
  setAccountHeader(context);
  bindLogoutButtons();

  document.dispatchEvent(new CustomEvent("seumbiz:auth-ready", { detail: context }));

  return context;
};

requireBizAuth().catch((error) => {
  console.error(error);
  redirectToLogin("auth_error");
});
