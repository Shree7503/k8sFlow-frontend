import { useState, useEffect } from 'react';

export const useAuthToken = (
    key: string, 
    initialValue: string | null
): [string | null, React.Dispatch<React.SetStateAction<string | null>>, () => void] => {
    const [token, setToken] = useState<string | null>(() => {
        try {
            return localStorage.getItem(key) || initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem(key, token);  // save as string
        } else {
            localStorage.removeItem(key);      // clean up if empty
        }
    }, [key, token]);

    const removeToken = () => {
        setToken(initialValue);
        localStorage.removeItem(key);
        localStorage.removeItem("user-storage");
    };

    return [token, setToken, removeToken];
};