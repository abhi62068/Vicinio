const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API_WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

export { API_BASE_URL, API_WS_BASE_URL };
