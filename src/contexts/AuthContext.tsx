import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { checkPocketBaseHealth, pb, isPocketBaseConfigured } from '../lib/pocketbase';
import { isAuthRejection } from '../lib/authErrors';
import type { BackendStatus } from '../lib/pocketbase';
import { useFlashcardStore } from '../store/store';
import { safeLocalStorage } from '../utils/safeStorage';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
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
  signUp: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
  signIn: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
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
    role: record.role === 'admin' ? 'admin' : 'user',
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
          } catch (err) {
            // ออฟไลน์หรือเซิร์ฟล่ม: คง session เดิมไว้ ใช้งานต่อแบบออฟไลน์ได้
            if (isAuthRejection(err)) pb.authStore.clear();
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

  const signUp = async (username: string, password: string) => {
    try {
      await pb.collection('users').create({
        username: username.trim(),
        password,
        passwordConfirm: password,
      });
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

  const signIn = async (username: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(username.trim(), password);
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
      const res = await pb.send<{ available: boolean }>('/api/memokard/username-available', {
        query: { u: username.trim() },
      });
      return res.available;
    } catch {
      return true; // ติดต่อเซิร์ฟเวอร์ไม่ได้ ให้ผู้ใช้ลองสมัครแล้วดู error จริงแทน
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signOut,
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
