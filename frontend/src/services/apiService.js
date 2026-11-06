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
 * 
 * Có cơ chế fallback tự động gọi thẳng FastAPI AI Service (port 8000)
 * khi Spring Boot Backend chưa chạy hoặc đang offline.
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
        // 1. Thử gọi qua Spring Boot API Gateway
        try {
            const res = await fetch(`${API_URL}/api/analysis/predict`, {
                method: "POST",
                headers: defaultHeaders,
                credentials: "include",
                body: JSON.stringify({ text }),
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (springErr) {
            console.warn("Spring Boot chưa khả dụng, thử kết nối trực tiếp FastAPI port 8000:", springErr);
        }

        // 2. Dự phòng: Gọi trực tiếp FastAPI AI Service (port 8000)
        try {
            const directRes = await fetch("http://localhost:8000/predict", {
                method: "POST",
                headers: defaultHeaders,
                body: JSON.stringify({ text }),
            });
            if (directRes.ok) {
                return await directRes.json();
            }
        } catch (fastApiErr) {
            console.error("Không thể kết nối tới cả Spring Boot và FastAPI AI Service:", fastApiErr);
        }

        throw new Error("Không thể kết nối dịch vụ AI. Hãy chắc chắn AI Service đang chạy trên cổng 8000.");
    },

    async predictBatch(comments) {
        // 1. Thử gọi qua Spring Boot API Gateway
        try {
            const res = await fetch(`${API_URL}/api/analysis/batch`, {
                method: "POST",
                headers: defaultHeaders,
                credentials: "include",
                body: JSON.stringify({ comments }),
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (springErr) {
            console.warn("Spring Boot chưa khả dụng, thử kết nối trực tiếp FastAPI port 8000:", springErr);
        }

        // 2. Dự phòng: Gọi trực tiếp FastAPI AI Service (port 8000)
        try {
            const directRes = await fetch("http://localhost:8000/predict/batch", {
                method: "POST",
                headers: defaultHeaders,
                body: JSON.stringify({ comments }),
            });
            if (directRes.ok) {
                return await directRes.json();
            }
        } catch (fastApiErr) {
            console.error("Không thể kết nối tới cả Spring Boot và FastAPI AI Service:", fastApiErr);
        }

        throw new Error("Không thể kết nối dịch vụ AI. Hãy chắc chắn AI Service đang chạy trên cổng 8000.");
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
        // Thử kiểm tra qua Spring Boot hoặc trực tiếp cổng 8000
        try {
            const res = await fetch(`${API_URL}/api/health/ai`);
            if (res.ok) return await res.json();
        } catch (e) {
            // ignore
        }
        try {
            const directRes = await fetch("http://localhost:8000/health");
            return await directRes.json();
        } catch (e) {
            return { status: "offline", error: e.message };
        }
    },
};
