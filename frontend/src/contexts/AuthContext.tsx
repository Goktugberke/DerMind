import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  skinType?: string;
  allergies?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // LocalStorage'dan kullanıcı bilgisini yükle
  useEffect(() => {
    const savedUser = localStorage.getItem('dermind_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (
    email: string, 
    // password: string
  ): Promise<boolean> => {
    // Mock login - gerçek projede API çağrısı yapılacak
    // Şimdilik herhangi bir email/password ile giriş yapılabilir
    const mockUser: User = {
      id: '1',
      email,
      name: email.split('@')[0],
      skinType: 'Karma',
      allergies: [],
    };
    setUser(mockUser);
    localStorage.setItem('dermind_user', JSON.stringify(mockUser));
    return true;
  };

  const register = async (
    email: string,
    // password: string,
    name: string
  ): Promise<boolean> => {
    // Mock register - gerçek projede API çağrısı yapılacak
    const mockUser: User = {
      id: Date.now().toString(),
      email,
      name,
      skinType: undefined,
      allergies: [],
    };
    setUser(mockUser);
    localStorage.setItem('dermind_user', JSON.stringify(mockUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dermind_user');
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('dermind_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

