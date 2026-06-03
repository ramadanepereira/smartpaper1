import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

/* ── URL base da API ──
 * Em desenvolvimento: http://localhost:3001/api
 * Em produção: definir VITE_API_URL no deploy (Vercel → variável de ambiente)
 * O Vite substitui import.meta.env.VITE_API_URL em build/produção. */
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const AuthContext = createContext(null);

/* ── Provider de Autenticação ──
 * Fornece estado global de utilizador autenticado, token JWT, darkMode e API.
 * Ao montar, verifica se existe token no localStorage e tenta validá-lo com /auth/me.
 * Se o token for inválido/expirado, limpa o localStorage. */
export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  /* ── Verificação de sessão ao carregar a página ──
   * Tenta restaurar a sessão a partir do token guardado no localStorage. */
  useEffect(() => {
    const token = localStorage.getItem('sp_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API}/auth/me`)
        .then(res => setUtilizador(res.data))
        .catch(() => { localStorage.removeItem('sp_token'); delete axios.defaults.headers.common['Authorization']; })
        .finally(() => setCarregando(false));
    } else {
      setCarregando(false);
    }
  }, []);

  /* ── Login: envia credenciais, armazena token JWT ── */
  const login = async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, { username, password });
    localStorage.setItem('sp_token', res.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUtilizador(res.data.utilizador);
    return res.data;
  };

  /* ── Logout: remove token e limpa estado ── */
  const logout = () => {
    localStorage.removeItem('sp_token');
    delete axios.defaults.headers.common['Authorization'];
    setUtilizador(null);
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <AuthContext.Provider value={{ utilizador, carregando, darkMode, login, logout, toggleDarkMode, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
