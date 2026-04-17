import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/authApi";
import { authEventName } from "@/api/httpClient";
import { USER_ROLES } from "@/lib/constants";

const AuthContext = createContext(null);

const emptyUser = {
  id: "",
  name: "",
  email: "",
  phone: "",
  profilePhoto: "",
  role: null,
  isEmailVerified: false,
  isActive: false,
  lastLogin: null,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(emptyUser);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const profile = await authApi.me();
        setUser(profile.user);
      } catch {
        setUser(emptyUser);
      } finally {
        setIsBootstrapping(false);
      }
    };

    initializeSession();
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      setUser(emptyUser);
    }

    window.addEventListener(authEventName, handleAuthExpired);
    return () => window.removeEventListener(authEventName, handleAuthExpired);
  }, []);

  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    setUser(result.user);
    return result.user;
  };

  const register = async (payload) => {
    const result = await authApi.register(payload);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Keep logout resilient even if API call fails.
    } finally {
      setUser(emptyUser);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.me();
      setUser(profile.user);
      return profile.user;
    } catch {
      setUser(emptyUser);
      return emptyUser;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user.id),
      isBootstrapping,
      isStudent: user.role === USER_ROLES.STUDENT,
      isStaff: user.role === USER_ROLES.STAFF,
      isProvost: user.role === USER_ROLES.PROVOST,
      refreshUser,
      login,
      register,
      logout,
    }),
    [isBootstrapping, refreshUser, user]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export default AuthContext;
