import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
    headers: {
        "Content-Type": "application/json",
    },
});

// request interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("API Error:", error.response);
        return Promise.reject(error);
    }
);

export default api;