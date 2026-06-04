import { createClient } from "@supabase/supabase-js";

const STORAGE_KEYS = {
  url: "supabase_url",
  anonKey: "supabase_anon_key",
};

const getStoredValue = (key) => {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage?.getItem(key) || "";
  } catch {
    return "";
  }
};

const getParamValue = (key) => {
  if (typeof window === "undefined") return "";

  try {
    return new URLSearchParams(window.location.search).get(key) || "";
  } catch {
    return "";
  }
};

const saveRuntimeConfig = (url, anonKey) => {
  if (typeof window === "undefined" || !url || !anonKey) return;

  try {
    window.localStorage?.setItem(STORAGE_KEYS.url, url);
    window.localStorage?.setItem(STORAGE_KEYS.anonKey, anonKey);
  } catch {
    // Ignore storage failures and use the values for the current page load only.
  }
};

const querySupabaseUrl = getParamValue("supabase_url");
const querySupabaseAnonKey = getParamValue("supabase_anon_key");

if (querySupabaseUrl && querySupabaseAnonKey) {
  saveRuntimeConfig(querySupabaseUrl, querySupabaseAnonKey);
}

export const supabaseUrl = querySupabaseUrl || getStoredValue(STORAGE_KEYS.url) || import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey =
  querySupabaseAnonKey || getStoredValue(STORAGE_KEYS.anonKey) || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
