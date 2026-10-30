export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const loginWithThreads = () => {
    // window.location.href =
    //     `${API_URL}/auth/threads`;
    // Extension: mở tab mới thay vì redirect trong popup
    if (typeof chrome !== 'undefined' && chrome.tabs) {
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
