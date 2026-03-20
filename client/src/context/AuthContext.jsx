import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const DEV_USER = {
  id: 'a588d9ca-5f7a-44ab-902f-36dacffea925',
  email: 'maraicher@exploitation.fr',
  name: 'Maraîcher',
  role: 'MARAICHER',
};

export const AuthProvider = ({ children }) => {
  const [user] = useState(DEV_USER);
  const loading = false;
  const isAuthenticated = true;
  const login = async () => DEV_USER;
  const logout = async () => {};
  const updateUser = () => {};

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};

export default AuthContext;
