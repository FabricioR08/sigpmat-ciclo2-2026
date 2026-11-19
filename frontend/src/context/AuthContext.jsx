import { createContext, useContext, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sigpmat_token'));
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('sigpmat_usuario');
    if (!guardado) return null;
    try {
      return JSON.parse(guardado);
    } catch {
      return null;
    }
  });

  const login = async (usuarioInput, claveInput) => {
    const { data } = await axiosClient.post('/auth/login', {
      usuario: usuarioInput,
      clave: claveInput,
    });

    localStorage.setItem('sigpmat_token', data.token);
    localStorage.setItem('sigpmat_usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem('sigpmat_token');
    localStorage.removeItem('sigpmat_usuario');
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        login,
        logout,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}