import { API_URL } from "./authService";

const defaultHeaders = {
    "Content-Type": "application/json",
};

/**
 * Service giao tiếp với Spring Boot Backend cho toàn bộ tính năng:
 * - Threads Posts / Comments
 * - AI Analysis (Single, Batch, Analyze Post)
 * - Dashboard Overview
 * - Admin Portal
 */
export const apiService = {
    // ==================== THREADS POSTS & COMMENTS ====================
    async getPosts() {
        const res = await fetch(`${API_URL}/api/posts`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy danh sách bài viết");
        return await res.json();
    },

    async getPostById(postId) {
        const res = await fetch(`${API_URL}/api/posts/${postId}`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy chi tiết bài viết");
        return await res.json();
    },

    async getPostComments(postId) {
        const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy bình luận bài viết");
        return await res.json();
    },

    // ==================== AI ANALYSIS ====================
    async predictSingle(text) {
        const res = await fetch(`${API_URL}/api/analysis/predict`, {
            method: "POST",
            headers: defaultHeaders,
            credentials: "include",
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("Không thể phân tích bình luận");
        return await res.json();
    },

    async predictBatch(comments) {
        const res = await fetch(`${API_URL}/api/analysis/batch`, {
            method: "POST",
            headers: defaultHeaders,
            credentials: "include",
            body: JSON.stringify({ comments }),
        });
        if (!res.ok) throw new Error("Không thể phân tích danh sách bình luận");
        return await res.json();
    },

    async analyzePost(postId) {
        const res = await fetch(`${API_URL}/api/posts/${postId}/analyze`, {
            method: "POST",
            headers: defaultHeaders,
            credentials: "include",
        });
        if (!res.ok) throw new Error("Lỗi khi phân tích toàn bộ bài viết");
        return await res.json();
    },

    async getPostAnalysis(postId) {
        const res = await fetch(`${API_URL}/api/posts/${postId}/analysis`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Chưa có kết quả phân tích cho bài viết này");
        return await res.json();
    },

    async getAnalysisHistory() {
        const res = await fetch(`${API_URL}/api/analysis/history`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy lịch sử phân tích");
        return await res.json();
    },

    async getOverview() {
        const res = await fetch(`${API_URL}/api/overview`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy dữ liệu tổng quan");
        return await res.json();
    },

    // ==================== ADMIN PORTAL ====================
    async adminLogin(username, password) {
        const res = await fetch(`${API_URL}/api/admin/auth/login`, {
            method: "POST",
            headers: defaultHeaders,
            credentials: "include",
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) throw new Error("Đăng nhập quản trị viên thất bại");
        return await res.json();
    },

    async adminLogout() {
        const res = await fetch(`${API_URL}/api/admin/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        return res.ok;
    },

    async getAdminMe() {
        const res = await fetch(`${API_URL}/api/admin/auth/me`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) return null;
        return await res.json();
    },

    async getAdminUsers() {
        const res = await fetch(`${API_URL}/api/admin/users`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy danh sách người dùng");
        return await res.json();
    },

    async updateAdminUserStatus(userId, status) {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
            method: "PATCH",
            headers: defaultHeaders,
            credentials: "include",
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Không thể cập nhật trạng thái người dùng");
        return await res.json();
    },

    async getAdminStatistics() {
        const res = await fetch(`${API_URL}/api/admin/statistics`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Không thể lấy thống kê hệ thống");
        return await res.json();
    },

    // ==================== SYSTEM HEALTH ====================
    async getBackendHealth() {
        const res = await fetch(`${API_URL}/api/health`);
        return await res.json();
    },

    async getAiHealth() {
        const res = await fetch(`${API_URL}/api/health/ai`);
        return await res.json();
    },
};
