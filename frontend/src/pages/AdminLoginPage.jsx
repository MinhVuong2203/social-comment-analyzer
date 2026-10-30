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
            setErrorMessage("Vui lòng nhập tên đăng nhập hoặc email quản trị.");
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
        <div className="bg-[#111319] font-['Inter'] text-[#e2e2eb] flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#c0c1ff]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#4cd7f6]/10 blur-3xl pointer-events-none" />

            <main className="w-full max-w-[420px] bg-[#191b22] border border-[#282a30] rounded-xl shadow-2xl p-6 sm:p-7 relative z-10">
                {/* Header Telemetry */}
                <header className="flex items-center justify-between pb-4 border-b border-[#282a30] mb-6">
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                        <span className="font-['JetBrains_Mono'] text-[10px] tracking-wider uppercase font-semibold text-[#4edea3]">
                            ADMIN PORTAL
                        </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#908fa0] font-['JetBrains_Mono'] text-[10px]">
                        <span className="material-symbols-outlined text-[14px] text-[#4cd7f6]">
                            lock
                        </span>
                        <span className="text-[#c7c4d7]">RESTRICTED</span>
                    </div>
                </header>

                {/* Hero / Title Section */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1e1f26] border border-[#33343b] text-[#c0c1ff] shadow-inner mb-3">
                        <span className="material-symbols-outlined text-[28px]">
                            person
                        </span>
                    </div>
                    <h1 className="font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-[#f1f1f6]">
                        Đăng nhập Quản trị viên
                    </h1>
                    <p className="text-xs text-[#908fa0] mt-1.5 leading-relaxed max-w-[320px] mx-auto">
                        Hệ thống điều hành Social Comment Analyzer<br />& Quản trị AI
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs mb-4 animate-fadeIn">
                        <span className="material-symbols-outlined text-[18px] shrink-0">
                            error
                        </span>
                        <span className="leading-snug">{errorMessage}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username or Email */}
                    <div>
                        <label
                            htmlFor="admin-username"
                            className="block text-xs font-medium text-[#c7c4d7] mb-1.5"
                        >
                            Tên đăng nhập hoặc Email
                        </label>
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined text-[18px] text-[#908fa0] absolute left-3 pointer-events-none">
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
                                className="w-full h-10 bg-[#1e1f26] text-[#e2e2eb] placeholder:text-[#908fa0]/50 text-xs rounded-lg pl-9 pr-3 border border-[#33343b] focus:outline-none focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label
                            htmlFor="admin-password"
                            className="block text-xs font-medium text-[#c7c4d7] mb-1.5"
                        >
                            Mật khẩu
                        </label>
                        <div className="relative flex items-center">
                            <span className="material-symbols-outlined text-[18px] text-[#908fa0] absolute left-3 pointer-events-none">
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
                                className="w-full h-10 bg-[#1e1f26] text-[#e2e2eb] placeholder:text-[#908fa0]/50 text-xs rounded-lg pl-9 pr-10 border border-[#33343b] focus:outline-none focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff] transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                className="absolute right-2.5 text-[#908fa0] hover:text-[#e2e2eb] transition p-1"
                                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                <span className="material-symbols-outlined text-[18px] block">
                                    {showPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Extra options: Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center space-x-2 cursor-pointer select-none text-[#c7c4d7] hover:text-[#e2e2eb] transition">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3.5 h-3.5 rounded bg-[#1e1f26] border-[#33343b] text-[#c0c1ff] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <span>Ghi nhớ phiên</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowForgotModal(true)}
                            className="text-[#c0c1ff] hover:text-[#e1e0ff] transition hover:underline"
                        >
                            Quên mật khẩu?
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 mt-2 bg-[#c0c1ff] hover:bg-[#b0b2ff] active:scale-[0.99] text-[#1000a9] font-['Plus_Jakarta_Sans'] font-semibold text-xs rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:pointer-events-none"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-[#1000a9] border-t-transparent rounded-full animate-spin" />
                                <span>Đang xác thực...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập Quản trị</span>
                                <span className="material-symbols-outlined text-[16px]">
                                    arrow_forward
                                </span>
                            </>
                        )}
                    </button>
                </form>

                {/* Return link to user login */}
                <div className="mt-6 pt-5 border-t border-[#282a30] text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center space-x-1.5 text-xs text-[#908fa0] hover:text-[#c0c1ff] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[15px]">
                            arrow_back
                        </span>
                        <span>Quay lại đăng nhập người dùng (Threads)</span>
                    </Link>
                </div>

                {/* Security footer note */}
                <footer className="mt-4 flex items-center justify-center space-x-1 text-[#908fa0]/60 font-['JetBrains_Mono'] text-[10px]">
                    <span className="material-symbols-outlined text-[12px] text-[#4edea3]">
                        verified_user
                    </span>
                    <span>256-bit SSL Protected Workspace</span>
                </footer>
            </main>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-[#191b22] border border-[#282a30] rounded-xl max-w-sm w-full p-5 shadow-2xl relative">
                        <div className="w-10 h-10 rounded-full bg-[#c0c1ff]/10 text-[#c0c1ff] flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-[20px]">
                                help_outline
                            </span>
                        </div>
                        <h3 className="font-['Plus_Jakarta_Sans'] font-semibold text-sm text-[#e2e2eb] mb-1.5">
                            Khôi phục quyền truy cập Quản trị
                        </h3>
                        <p className="text-xs text-[#908fa0] leading-relaxed mb-4">
                            Vì lý do an toàn bảo mật hệ thống, tài khoản Quản trị viên không hỗ trợ tự cấp lại mật khẩu qua email. Vui lòng liên hệ trực tiếp <strong>Super Administrator</strong> hoặc Ban kỹ thuật để được cấp lại mật khẩu.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            className="w-full py-2 bg-[#282a30] hover:bg-[#33343b] text-[#e2e2eb] text-xs font-medium rounded-lg transition"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
