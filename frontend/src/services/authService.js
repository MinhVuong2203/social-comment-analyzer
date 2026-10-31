const API_URL = import.meta.env.VITE_API_URL || "https://provider-egging-stratus.ngrok-free.dev";
// cần chỉnh

export const loginWithThreads = () => {
    // Nếu chạy trong Chrome Extension: mở tab mới
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: `${API_URL}/auth/threads` });
    } else {
        // Local dev: redirect bình thường
        window.location.href = `${API_URL}/auth/threads`;
    }
};

export const getCurrentUser = async () => {
    const response = await fetch(
        `${API_URL}/api/auth/me`,
        {
            method: "GET",
            credentials: "include",
        }
    );

    if (response.status === 401) {
        return null;
    }

    if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        const err = new Error(data.error || "Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
        err.blocked = true;
        err.blockedUntil = data.blockedUntil;
        err.blockReason = data.blockReason;
        throw err;
    }

    if (!response.ok) {
        throw new Error(
            "Không thể lấy thông tin người dùng"
        );
    }

    return await response.json();
};

export const logout = async () => {
    const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
            method: "POST",
            credentials: "include",
        }
    );

    return response.ok;
};
