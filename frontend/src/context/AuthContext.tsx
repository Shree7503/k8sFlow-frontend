import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useAuthToken } from "../hooks/useAuth";
import { useAuthStore } from "../store/store";
import { useRBACStore } from "../store/rbacStore";

interface AuthContextType {
    token: string | null;
    login: (newToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [token, setToken, removeToken] = useAuthToken('authToken', null);
    const { clearUser } = useAuthStore();
    const { fetchClusterAccess, clearAccess } = useRBACStore();

    // When token appears (login or page reload), fetch cluster access
    useEffect(() => {
        if (token) {
            fetchClusterAccess();
        }
    }, [token, fetchClusterAccess]);

    const login = (newToken: string) => {
        setToken(newToken);
        // cluster access will be fetched by the useEffect above
    };

    const logout = () => {
        clearUser();       // Clear user from Zustand store
        clearAccess();     // Clear RBAC cluster access
        removeToken();     // Clear auth token from localStorage
    };

    const value = useMemo(() => ({
        token,
        login,
        logout,
    }), [token]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
