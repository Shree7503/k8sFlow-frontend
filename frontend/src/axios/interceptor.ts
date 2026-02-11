import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("authToken");
            window.location.href = "/login";
        }

        // Handle 403 Forbidden — RBAC-aware error handling
        if (error.response?.status === 403) {
            const data = error.response?.data;
            const message = data?.message || data?.error || '';
            
            // Dispatch custom event so UI components can react to permission errors
            window.dispatchEvent(
                new CustomEvent('rbac:forbidden', {
                    detail: {
                        message,
                        required: data?.required,
                        current: data?.current,
                        url: error.config?.url,
                        status: 403,
                    },
                })
            );
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;