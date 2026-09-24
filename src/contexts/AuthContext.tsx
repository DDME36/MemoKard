import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { checkPocketBaseHealth, pb, isPocketBaseConfigured } from '../lib/pocketbase';
import type { BackendStatus } from '../lib/pocketbase';
import { useFlashcardStore } from '../store/store';
import { safeLocalStorage } from '../utils/safeStorage';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  user_metadata?: {
    username?: string;
  };
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  // username + email + password
  signUp: (username: string, email: string, password: string) => Promise<{ error: { message: string } | null }>;
  // login ด้วย username หรือ email
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error: { message: string } | null }>;
  signInWithGoogle: () => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  isDemo: boolean;
  setDemoMode: (demo: boolean) => void;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  backendStatus: BackendStatus;
  retryBackend: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapRecordToAuthUser(record: Record<string, unknown> | null): AuthUser | null {
  if (!record || !record.id) return null;
  const username = (record.username as string) || `user_${(record.id as string).slice(0, 6)}`;
  return {
    id: record.id as string,
    email: (record.email as string) || '',
    username,
    user_metadata: {
      username,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return pb.authStore.record ? mapRecordToAuthUser(pb.authStore.record as Record<string, unknown>) : null;
  });
  const [session, setSession] = useState<AuthSession | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const u = mapRecordToAuthUser(pb.authStore.record as Record<string, unknown>);
      return u ? { token: pb.authStore.token, user: u } : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => {
    const stored = safeLocalStorage.get('demo-mode');
    return stored !== 'false';
  });
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(() =>
    isPocketBaseConfigured() ? 'checking' : 'unconfigured'
  );

  const retryBackend = useCallback(async () => {
    if (!isPocketBaseConfigured()) {
      setBackendStatus('unconfigured');
      return false;
    }

    setBackendStatus('checking');
    const available = await checkPocketBaseHealth();
    setBackendStatus(available ? 'available' : 'unavailable');
    return available;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(retryBackend);
  }, [retryBackend]);

  // Sync auth state with PocketBase authStore
  useEffect(() => {
    if (!isPocketBaseConfigured() || isDemo) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const initAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          // Verify or refresh token if still valid
          try {
            await pb.collection('users').authRefresh();
          } catch {
            pb.authStore.clear();
          }
        }
        const currentUser = mapRecordToAuthUser(pb.authStore.record as Record<string, unknown> | null);
        setUser(currentUser);
        setSession(currentUser ? { token: pb.authStore.token, user: currentUser } : null);
      } finally {
        setLoading(false);
      }
    };

    void initAuth();

    // Listen to PocketBase auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      const u = mapRecordToAuthUser(model as Record<string, unknown> | null);
      setUser(u);
      setSession(u ? { token, user: u } : null);
    });

    return () => {
      unsubscribe();
    };
  }, [isDemo]);

  const signUp = async (username: string, email: string, password: string) => {
    try {
      // 1. สร้างบัญชีในคอลเลกชัน users ของ PocketBase
      await pb.collection('users').create({
        username: username.trim(),
        email: email.trim(),
        password,
        passwordConfirm: password,
      });

      // 2. ล็อกอินอัตโนมัติทันที
      await pb.collection('users').authWithPassword(username.trim(), password);

      return { error: null };
    } catch (err: unknown) {
      const errorObj = err as { message?: string; data?: { message?: string } };
      return {
        error: {
          message: errorObj.data?.message || errorObj.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
        },
      };
    }
  };

  const signIn = async (usernameOrEmail: string, password: string) => {
    try {
      // PocketBase authWithPassword รองรับทั้ง username และ email ในฟิลด์เดียวกันได้ทันที
      await pb.collection('users').authWithPassword(usernameOrEmail.trim(), password);
      return { error: null };
    } catch (err: unknown) {
      const errorObj = err as { message?: string; data?: { message?: string } };
      return {
        error: {
          message: errorObj.data?.message || errorObj.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
        },
      };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' });
      return { error: null };
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      return {
        error: {
          message: errorObj.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้',
        },
      };
    }
  };

  const signOut = async () => {
    pb.authStore.clear();
    setUser(null);
    setSession(null);
    useFlashcardStore.getState().clearStore();
  };

  const setDemoMode = (demo: boolean) => {
    setIsDemo(demo);
    safeLocalStorage.set('demo-mode', demo.toString());
  };

  const checkUsernameAvailable = async (username: string) => {
    if (!username.trim() || !isPocketBaseConfigured() || isDemo) return true;

    try {
      await pb.collection('users').getFirstListItem(`username = "${username.trim()}"`);
      // ถ้าพบ record แปลว่าชื่อซ้ำ
      return false;
    } catch {
      // ไม่พบ แปลว่าชื่อว่าง ใช้ได้
      return true;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signInWithGoogle, signOut,
      isDemo, setDemoMode, checkUsernameAvailable,
      backendStatus, retryBackend,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
