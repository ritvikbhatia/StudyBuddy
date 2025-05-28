import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  preferredLanguage: string; // Added
  setPreferredLanguageState: (lang: string) => void; // Added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferredLanguage, setPreferredLanguageState] = useState<string>('en'); // Default to English

  useEffect(() => {
    const storedUser = storageService.getUser();
    if (storedUser) {
      setUser(storedUser);
      if (storedUser.preferredLanguage) {
        setPreferredLanguageState(storedUser.preferredLanguage);
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    storageService.setUser(userData);
    if (userData.preferredLanguage) {
      setPreferredLanguageState(userData.preferredLanguage);
    }
  };

  const logout = () => {
    setUser(null);
    storageService.removeUser();
    setPreferredLanguageState('en'); // Reset to default on logout
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = storageService.updateUser(userData);
      if (updatedUser) {
        setUser(updatedUser);
        if (updatedUser.preferredLanguage) {
          setPreferredLanguageState(updatedUser.preferredLanguage);
        }
      }
    }
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    preferredLanguage,
    setPreferredLanguageState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
