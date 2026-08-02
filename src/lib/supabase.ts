import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type BackendStatus = 'unconfigured' | 'checking' | 'available' | 'unavailable';

// ตรวจสอบว่ามีการตั้งค่า Supabase หรือไม่
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

/** Check the service itself: navigator.onLine cannot detect a paused project. */
export async function checkSupabaseHealth(timeoutMs = 5000): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

// สร้าง Supabase client (ใช้ dummy values ถ้ายังไม่ได้ตั้งค่า)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Database Types
export interface Database {
  public: {
    Tables: {
      decks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string;
          question: string;
          answer: string;
          ease_factor: number;
          interval: number;
          repetition: number;
          next_review: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deck_id: string;
          question: string;
          answer: string;
          ease_factor?: number;
          interval?: number;
          repetition?: number;
          next_review?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          deck_id?: string;
          question?: string;
          answer?: string;
          ease_factor?: number;
          interval?: number;
          repetition?: number;
          next_review?: string;
          created_at?: string;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          last_review_date: string;
          streak: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_review_date?: string;
          streak?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          last_review_date?: string;
          streak?: number;
          updated_at?: string;
        };
      };
    };
  };
}
