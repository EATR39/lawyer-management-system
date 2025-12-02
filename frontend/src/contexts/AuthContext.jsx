/**
 * Avukat Yönetim Sistemi - Auth Context
 * Kimlik doğrulama durumu ve işlemleri
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Auth Context
const AuthContext = createContext(null);

/**
 * Auth Context Provider
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Token'ları localStorage'da sakla
  const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  };

  // Token'ları temizle
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // Mevcut kullanıcıyı getir
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      console.error('Kullanıcı bilgisi alınamadı:', err);
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Uygulama başladığında kullanıcıyı kontrol et
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Giriş yap
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user: userData } = response.data;
      
      setTokens(access_token, refresh_token);
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Giriş başarısız';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Çıkış yap
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Çıkış hatası:', err);
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  // Şifre değiştir
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Şifre değiştirilemedi';
      return { success: false, error: message };
    }
  };

  // Kullanıcı bilgilerini güncelle
  const updateProfile = async (data) => {
    try {
      const response = await api.put(`/users/${user.id}`, data);
      setUser(response.data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Profil güncellenemedi';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    changePassword,
    updateProfile,
    refreshUser: fetchCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Auth Context Hook
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth hook must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
