import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_USE_PROXY === 'true' 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api');

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Token ${storedToken}`;
          const response = await axios.get(`${API_URL}/auth/user/`);
          setUser(response.data);
          setToken(storedToken);
        } catch (err) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email,
        password,
      });
      
      const { user: userData, token: authToken } = response.data;
      setUser(userData);
      setToken(authToken);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || 'Login failed. Please try again.';
        setError(message);
        throw new Error(message);
      }
      setError('An unexpected error occurred');
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/register/`, data);
      
      const { user: userData, token: authToken } = response.data;
      setUser(userData);
      setToken(authToken);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        
        // Build error message from field errors
        let message = 'Registration failed. Please try again.';
        
        if (responseData && typeof responseData === 'object') {
          const errors: string[] = [];
          for (const [key, value] of Object.entries(responseData)) {
            if (Array.isArray(value)) {
              errors.push(value[0]);
            } else if (typeof value === 'string') {
              errors.push(value);
            }
          }
          if (errors.length > 0) {
            message = errors.join(', ');
          }
        }
        
        setError(message);
        throw new Error(message);
      }
      setError('An unexpected error occurred');
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_URL}/auth/logout/`);
      }
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
