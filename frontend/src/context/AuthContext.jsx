/**
 * Sesión global: login, perfil, rol activo y toasts unificados.
 * Los toasts de mutación muestran el `message` que devuelve el backend.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { useSnackbar } from "notistack";
import { loginRequest, getSessionRequest } from "../api/userRequest.js";
import { getAccount } from "../api/accountRequest.js";
import { changeRole as changeRoleRequest } from "../api/authRequest.js";
import { buildImageUrl, clearToken, getToken, setToken } from "../api/axios.js";
import { getApiErrorMessage, getApiSuccessMessage } from "../utils/apiMessages.js";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};

export function AuthProvider({ children }) {
  const [errors, setErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profileImageUser, setProfileImageUser] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadUserProfile = async () => {
    const session = await getSessionRequest();
    const { data } = await getAccount(session.data.accountId, session.data.rolId);
    const u = data.user || {};
    setUser({
      firstName: u.firstName,
      secondName: u.secondName,
      firstLastName: u.firstLastName,
      secondLastName: u.secondLastName,
      ci: u.ci,
      birthday: u.birthday,
      gender: u.gender,
      photo: u.photo,
      username: data.username,
      accountId: data.id,
      userId: session.data.userId,
      rolId: session.data.rolId,
      loginRol: session.data.loginRol,
      roles: data.roles || [],
    });
    setProfileImageUser(u.photo ? buildImageUrl(u.photo) : null);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const signin = async (userData) => {
    try {
      const { data } = await loginRequest(userData);

      if (data.selectRole) {
        return { selectRole: true, roles: data.roles, accountId: data.accountId };
      }

      if (setToken(data?.token)) {
        await loadUserProfile();
        return { success: true };
      }

      setErrors({ message: data.message || "No se pudo iniciar sesión", status: "error" });
      return { error: true };
    } catch (error) {
      setIsAuthenticated(false);
      setIsLoading(false);
      setErrors({
        message: getApiErrorMessage(error, "Error de conexión"),
        status: "error",
      });
      return { error: true };
    }
  };

  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
    setProfileImageUser(null);
    setIsLoading(false);
  };

  const changeRole = async (newRoleId) => {
    try {
      const { data } = await changeRoleRequest({
        accountId: user.accountId,
        rolId: newRoleId,
      });
      if (!setToken(data?.token)) {
        logout();
        enqueueSnackbar(
          getApiErrorMessage({ message: "Token inválido al cambiar de rol" }),
          { variant: "error" }
        );
        return;
      }
      await loadUserProfile();
      enqueueSnackbar(getApiSuccessMessage({ data }), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error), { variant: "error" });
    }
  };

  /**
   * Toast unificado.
   * - `message`: texto directo (validaciones locales).
   * - `promise`: mutación; éxito/error leen `response.data.message` del backend.
   */
  const toast = async ({ message, variant = "info", promise } = {}) => {
    if (message && !promise) {
      enqueueSnackbar(message, { variant, autoHideDuration: 3000 });
      return;
    }
    if (!promise) return;

    try {
      const result = await promise;
      const text = getApiSuccessMessage(result);
      if (text) {
        enqueueSnackbar(text, { variant: "success", autoHideDuration: 3000 });
      }
      return result;
    } catch (error) {
      const text = getApiErrorMessage(error);
      if (text) {
        enqueueSnackbar(text, { variant: "error", autoHideDuration: 4000 });
      }
      throw error;
    }
  };

  const checkLogin = async () => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    try {
      await getSessionRequest();
      await loadUserProfile();
    } catch {
      clearToken();
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    if (!errors.message) return;
    const t = setTimeout(() => setErrors({}), 5000);
    return () => clearTimeout(t);
  }, [errors]);

  return (
    <AuthContext.Provider
      value={{
        signin,
        logout,
        changeRole,
        errors,
        isAuthenticated,
        isLoading,
        user,
        profileImageUser,
        setProfileImageUser,
        loadUserProfile,
        toast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
