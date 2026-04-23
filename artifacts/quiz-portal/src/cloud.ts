import { supabase } from "./supabase";
import {
  DEFAULT_CONFIG,
  DEFAULT_BANK,
  type QuizConfig,
  type Question,
} from "./quiz-data";

const TABLE = "quiz_settings";

export async function fetchConfig(): Promise<QuizConfig> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", "config")
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_CONFIG;
  const v = data.value as Partial<QuizConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...v,
    ADMIN: { ...DEFAULT_CONFIG.ADMIN, ...(v.ADMIN || {}) },
    SCHOOLS: v.SCHOOLS || DEFAULT_CONFIG.SCHOOLS,
  };
}

export async function saveConfigCloud(cfg: QuizConfig): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { key: "config", value: cfg, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}

export async function resetConfigCloud(): Promise<void> {
  await supabase.from(TABLE).delete().eq("key", "config");
}

export async function fetchBank(): Promise<Question[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", "bank")
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_BANK;
  const arr = data.value as Question[];
  if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_BANK;
  return arr;
}

export async function saveBankCloud(bank: Question[]): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { key: "bank", value: bank, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}

export async function resetBankCloud(): Promise<void> {
  await supabase.from(TABLE).delete().eq("key", "bank");
}
