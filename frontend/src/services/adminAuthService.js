// Có thể override qua biến môi trường VITE_API_URL, mặc định trỏ về backend ngrok/local
const API_URL = import.meta.env.VITE_API_URL || "https://provider-egging-stratus.ngrok-free.dev";

export const loginAdmin = async (username, password) => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Đăng nhập quản trị thất bại.");
    }

    return data;
};

export const getCurrentAdmin = async () => {
    const response = await fetch(`${API_URL}/api/admin/me`, {
        method: "GET",
        credentials: "include",
    });

    if (response.status === 401 || response.status === 403) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Không thể xác thực quản trị viên.");
    }

    return await response.json();
};

export const logoutAdmin = async () => {
    const response = await fetch(`${API_URL}/api/admin/logout`, {
        method: "POST",
        credentials: "include",
    });

    return response.ok;
};

