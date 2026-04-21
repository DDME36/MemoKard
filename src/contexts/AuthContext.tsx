import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // username + email + password
  signUp: (username: string, email: string, password: string) => Promise<{ error: any }>;
  // login ด้วย username หรือ email ก็ได้
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isDemo: boolean;
  setDemoMode: (demo: boolean) => void;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => {
    return localStorage.getItem('demo-mode') === 'true';
  });

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemo) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const signUp = async (username: string, email: string, password: string) => {
    // สมัครด้วย email + password + username ใน metadata
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (!error) {
      // สร้าง profile แยก (fallback กรณี trigger ไม่ทำงาน)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({ id: user.id, username });
      }
    }

    return { error };
  };

  const signIn = async (usernameOrEmail: string, password: string) => {
    let email = usernameOrEmail.trim();

    // ถ้าไม่มี @ = username → lookup email
    if (!email.includes('@')) {
      const { data, error: lookupError } = await supabase
        .rpc('get_email_by_username', { p_username: email });

      if (lookupError || !data) {
        return { error: { message: 'ไม่พบชื่อผู้ใช้นี้' } };
      }
      email = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const setDemoMode = (demo: boolean) => {
    setIsDemo(demo);
    localStorage.setItem('demo-mode', demo.toString());
  };

  const checkUsernameAvailable = async (username: string) => {
    if (!username.trim() || !isSupabaseConfigured() || isDemo) return true;
    
    // Check if username exists via RPC
    const { data } = await supabase
      .rpc('get_email_by_username', { p_username: username.trim() });
      
    // If it returns an email (or any truthy data), the username is TAKEN.
    if (data) {
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signInWithGoogle, signOut,
      isDemo, setDemoMode, checkUsernameAvailable,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
