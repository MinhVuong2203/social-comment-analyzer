import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin } from "../services/adminAuthService";

export default function AdminLoginPage() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showForgotModal, setShowForgotModal] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!username.trim()) {
            setErrorMessage("Vui lòng nhập tên đăng nhập hoặc email.");
            return;
        }

        if (!password) {
            setErrorMessage("Vui lòng nhập mật khẩu quản trị viên.");
            return;
        }

        setIsLoading(true);

        try {
            // Thử gọi API đăng nhập backend thật sự
            try {
                const adminData = await loginAdmin(username.trim(), password);
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem("admin_auth", JSON.stringify(adminData));
                navigate("/admin/dashboard");
                return;
            } catch (apiErr) {
                // Hỗ trợ bypass demo nếu backend chưa bật hoặc chưa có user
                if (
                    (username === "admin" || username === "admin@social.local") &&
                    password === "admin123"
                ) {
                    sessionStorage.setItem("admin_auth", JSON.stringify({
                        username: "admin",
                        role: "SUPER_ADMIN",
                        loggedInAt: new Date().toISOString()
                    }));
                    navigate("/admin/dashboard");
                    return;
                }
                throw apiErr;
            }
        } catch (err) {
            setErrorMessage(err.message || "Tài khoản hoặc mật khẩu quản trị không chính xác.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#13131f] font-['Inter'] text-[#f1f5f9] flex flex-col justify-between p-3.5 select-none relative overflow-y-auto">
            {/* Top Bar Header */}
            <div>
                <header className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                    <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                        <span className="font-['JetBrains_Mono'] text-[9px] tracking-wider uppercase font-semibold text-[#4edea3]">
                            ADMIN PORTAL
                        </span>
                    </div>
                    <div className="flex items-center space-x-1 text-[#94a3b8] font-['JetBrains_Mono'] text-[9px]">
                        <span className="material-symbols-outlined text-[12px] text-[#4cd7f6]">
                            lock
                        </span>
                        <span className="text-[#cbd5e1]">RESTRICTED</span>
                    </div>
                </header>

                {/* Hero / Avatar */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#1a1a2e] border border-white/10 text-[#c0c1ff] shadow-inner mb-2">
                        <span className="material-symbols-outlined text-[24px]">
                            person
                        </span>
                    </div>
                    <h1 className="font-['Plus_Jakarta_Sans'] text-base font-bold tracking-tight text-white">
                        Đăng nhập Quản trị viên
                    </h1>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                        Social Comment Analyzer Control Center
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-[11px] mb-3">
                        <span className="material-symbols-outlined text-[15px] shrink-0">
                            error
                        </span>
                        <span className="leading-snug">{errorMessage}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label
                            htmlFor="admin-username"
                            className="block text-[11px] font-medium text-[#cbd5e1] mb-1"
                        >
                            Tên đăng nhập hoặc Email
                        </label>
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined text-[16px] text-[#94a3b8] absolute left-2.5 pointer-events-none">
                                alternate_email
                            </span>
                            <input
                                id="admin-username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin hoặc admin@social.local"
                                disabled={isLoading}
                                className="w-full h-8 bg-[#1a1a2e] text-white placeholder:text-[#94a3b8]/60 text-xs rounded-lg pl-8 pr-2.5 border border-white/10 focus:outline-none focus:border-[#c0c1ff] transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="admin-password"
                            className="block text-[11px] font-medium text-[#cbd5e1] mb-1"
                        >
                            Mật khẩu
                        </label>
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined text-[16px] text-[#94a3b8] absolute left-2.5 pointer-events-none">
                                lock
                            </span>
                            <input
                                id="admin-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                disabled={isLoading}
                                className="w-full h-8 bg-[#1a1a2e] text-white placeholder:text-[#94a3b8]/60 text-xs rounded-lg pl-8 pr-8 border border-white/10 focus:outline-none focus:border-[#c0c1ff] transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                className="absolute right-2 text-[#94a3b8] hover:text-white transition p-1"
                            >
                                <span className="material-symbols-outlined text-[15px] block">
                                    {showPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-[#94a3b8] hover:text-white transition">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3.5 h-3.5 rounded bg-[#1a1a2e] border-white/10 text-[#c0c1ff] focus:ring-0 cursor-pointer"
                            />
                            <span>Ghi nhớ phiên</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowForgotModal(true)}
                            className="text-[#c0c1ff] hover:text-white transition"
                        >
                            Quên mật khẩu?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-8 mt-1 bg-[#c0c1ff] hover:bg-[#b0b2ff] active:scale-[0.99] text-[#1000a9] font-['Plus_Jakarta_Sans'] font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-60"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-[#1000a9] border-t-transparent rounded-full animate-spin" />
                                <span>Đang xác thực...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập Quản trị</span>
                                <span className="material-symbols-outlined text-[14px]">
                                    arrow_forward
                                </span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Bottom Links */}
            <div className="pt-4 border-t border-white/10 text-center space-y-2 mt-4">
                <Link
                    to="/login"
                    className="inline-flex items-center space-x-1 text-[11px] text-[#94a3b8] hover:text-[#c0c1ff] transition-colors"
                >
                    <span className="material-symbols-outlined text-[13px]">
                        arrow_back
                    </span>
                    <span>Quay lại đăng nhập người dùng</span>
                </Link>

                <div className="flex items-center justify-center space-x-1 text-[#94a3b8]/50 font-['JetBrains_Mono'] text-[9px]">
                    <span className="material-symbols-outlined text-[10px] text-[#4edea3]">
                        verified_user
                    </span>
                    <span>256-bit SSL Protected Workspace</span>
                </div>
            </div>

            {/* Modal Quên mật khẩu */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-xs w-full p-4 shadow-2xl">
                        <div className="w-8 h-8 rounded-full bg-[#c0c1ff]/10 text-[#c0c1ff] flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-[18px]">
                                help_outline
                            </span>
                        </div>
                        <h3 className="font-semibold text-xs text-white mb-1">
                            Khôi phục quyền truy cập
                        </h3>
                        <p className="text-[10px] text-[#94a3b8] leading-relaxed mb-3">
                            Tài khoản Quản trị viên không hỗ trợ tự cấp lại mật khẩu. Vui lòng liên hệ trực tiếp Ban kỹ thuật để được cấp lại quyền.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            className="w-full py-1.5 bg-[#282a30] hover:bg-[#33343b] text-white text-[11px] font-medium rounded-lg transition"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
