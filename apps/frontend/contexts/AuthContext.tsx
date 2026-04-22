'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api/client';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  tenantName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for preview mode (remove in production)
const DEMO_USER: User = {
  id: 1,
  email: 'demo@mughal-grace.com',
  fullName: 'Ahmad Khan',
  role: 'FACTORY_OWNER',
  tenantName: 'Mughal Grace Textiles',
};

// Demo mode - MUST be false in production
// Only enable via environment variable for local development
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? DEMO_USER : null);
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setIsLoading(false);
      return;
    }

    try {
      const token = Cookies.get('access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
      Cookies.remove('access_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;

      // Use secure cookies in production, allow insecure in development
      const isProduction = process.env.NODE_ENV === 'production';

      Cookies.set('access_token', accessToken, {
        expires: 1 / 96, // 15 minutes
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      });

      setUser(user);
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data);
      const { user, accessToken } = response.data;

      const isProduction = process.env.NODE_ENV === 'production';

      Cookies.set('access_token', accessToken, {
        expires: 1 / 96,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      });

      setUser(user);
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
