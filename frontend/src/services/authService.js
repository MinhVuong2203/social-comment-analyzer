const API_URL = "https://unhitched-denim-slacker.ngrok-free.dev";
// cần chỉnh

export const loginWithThreads = () => {
    window.location.href =
        `${API_URL}/auth/threads`;
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