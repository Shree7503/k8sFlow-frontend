import {create} from "zustand/react"
import {persist} from "zustand/middleware"
import type { SystemRoleValue } from "../types/rbac"
import { SystemRole } from "../types/rbac"

/**
 * Map a backend role value (string like "Admin" or number) to numeric SystemRoleValue.
 * The login response sends role as a string ("Admin", "Editor", "Viewer"),
 * while the rest of the app uses numeric values (0, 1, 2).
 */
export function mapRole(role: string | number | undefined): SystemRoleValue {
    if (typeof role === 'number') return role as SystemRoleValue;
    if (typeof role === 'string') {
        const lower = role.toLowerCase();
        if (lower === 'admin') return SystemRole.Admin;
        if (lower === 'editor') return SystemRole.Editor;
    }
    return SystemRole.Viewer;
}

export interface UserModel {
    id: string;  
    email: string;
    name?: string;
    role?: SystemRoleValue;
    joined?: string;
}

interface UserState {
    user: UserModel | null;
    setUser: (user: UserModel) => void;
    clearUser: () => void;
}

export const useAuthStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user: UserModel) => set({ user }),
            clearUser: () => set({ user: null }),
        }),
        {
            name: 'user-storage',
            partialize: (state) => ({
                user: state.user // Preserve the entire user object structure
            })
        }
    )
)