import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginWithThreads } from "../services/authService";
import threadsLogo from "../assets/threads-logo.png";

const LOGO_URL =
    "https://lh3.googleusercontent.com/aida/AEtjO1Usa8OU1ik5dASEFdXhYxC7p28j2tR8NOk540gQ_dDp7ygWN4tOqPVdh4_chspeT8pcH5rXrznRTu5VGrt4WkSBJcdFRU3T9CT3q9ioML1TEBUg19BnXq7vXzzygiQDdSQfqFaUmBXRweFgL1nHarSrx0VlWEfnbgYCkyynKhPeGG4X7kx9o_QT1PRW5qcLY8NUOpWrOgWHDubTa9j83loWmP7VHv25027fd_edZx4q2yyopaWoDOWadlRq";


export default function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [blockedInfo, setBlockedInfo] = useState(null);

    // Bắt tham số báo lỗi khóa tài khoản từ OAuth callback hoặc redirect
    useEffect(() => {
        const parseParams = () => {
            if (location.state && location.state.blocked) {
                setBlockedInfo({
                    until: location.state.until || null,
                    reason: location.state.reason || null,
                });
                return;
            }

            let search = location.search;
            if (!search && window.location.hash.includes("?")) {
                search = "?" + window.location.hash.split("?")[1];
            }
            if (!search) {
                search = window.location.search;
            }
            const params = new URLSearchParams(search);
            if (params.get("error") === "account_blocked") {
                setBlockedInfo({
                    until: params.get("until") || null,
                    reason: params.get("reason") || null,
                });
            }
        };
        parseParams();
    }, [location]);

    const formatLockUntil = (dateStr) => {
        if (!dateStr) return "Cho đến khi Quản trị viên mở lại";
        try {
            const d = new Date(dateStr);
            const diffMs = d - new Date();
            let remainingText = "";
            if (diffMs > 0) {
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays > 0) {
                    remainingText = ` (còn ${diffDays} ngày)`;
                } else if (diffHours > 0) {
                    remainingText = ` (còn ${diffHours} giờ)`;
                } else {
                    remainingText = ` (sắp hết hạn)`;
                }
            }
            return d.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }) + remainingText;
        } catch {
            return dateStr;
        }
    };

    // Nếu đã đăng nhập rồi thì tự redirect về overview
    useEffect(() => {
        if (!loading && user) {
            navigate("/overview", { replace: true });
        }
    }, [user, loading, navigate]);

    // Nạp Material Symbols một lần khi component mount
    useEffect(() => {
        const id = "sca-material-symbols-font";
        if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href =
                "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
            document.head.appendChild(link);
        }
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#0b0c11] font-['Inter'] text-[#e2e2eb] flex items-center justify-center px-4 py-10">

            {/* Nền: lưới mờ + 2 quầng sáng */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.35]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                }}
            />
            <div className="absolute -top-40 left-1/2 -translate-x-[70%] w-[520px] h-[520px] rounded-full bg-[#8083ff]/20 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-48 left-1/2 translate-x-[5%] w-[480px] h-[480px] rounded-full bg-[#4cd7f6]/15 blur-[120px] pointer-events-none" />

            <main className="relative w-full max-w-[400px]">

                {/* Logo & tiêu đề */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="relative mb-5">
                        <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-[#c0c1ff] via-[#4cd7f6] to-[#8083ff] opacity-30 blur-xl" />
                        <div className="relative w-[72px] h-[72px] rounded-2xl bg-[#11131a] ring-1 ring-white/10 flex items-center justify-center p-1.5 shadow-2xl overflow-hidden">
                            <img
                                alt="Social Comment Analyzer"
                                className="w-full h-full object-contain rounded-xl"
                                src={LOGO_URL}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fallback = e.currentTarget.parentElement.querySelector(".logo-fallback");
                                    if (fallback) fallback.style.display = "flex";
                                }}
                            />
                            <div className="logo-fallback hidden w-full h-full items-center justify-center text-[#c0c1ff]">
                                <span className="material-symbols-outlined text-[34px]">query_stats</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#11131a] ring-1 ring-white/10 flex items-center justify-center">
                            <span
                                className="material-symbols-outlined text-[14px] text-[#4edea3]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                bolt
                            </span>
                        </div>
                    </div>

                    <h1 className="font-['Plus_Jakarta_Sans'] text-[26px] leading-[32px] font-bold tracking-[-0.02em] bg-gradient-to-r from-[#e2e2eb] via-[#e1e0ff] to-[#c0c1ff] bg-clip-text text-transparent">
                        Social Comment Analyzer
                    </h1>
                    <p className="mt-2 text-[14px] leading-[22px] text-[#a9a8ba]">
                        Phân tích bình luận Threads bằng{" "}
                        <span className="whitespace-nowrap font-medium text-[#4cd7f6]">PhoBERT tiếng Việt</span>
                    </p>
                </div>

                {/* Thẻ đăng nhập */}
                <div className="rounded-2xl bg-[#14161d]/80 backdrop-blur-xl ring-1 ring-white/[0.07] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] p-6">

                    <h2 className="font-['Plus_Jakarta_Sans'] text-[17px] font-semibold text-[#e2e2eb]">
                        Đăng nhập
                    </h2>
                    <p className="mt-1 mb-5 text-[13px] text-[#908fa0]">
                        Chọn cách đăng nhập để tiếp tục
                    </p>

                    {/* Thông báo tài khoản bị khóa */}
                    {blockedInfo && (
                        <div className="mb-5 rounded-xl bg-[#3a0d12]/70 ring-1 ring-[#ffb4ab]/30 p-3.5">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px] text-[#ffb4ab] shrink-0">
                                    gpp_bad
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-[13px] font-semibold text-[#ffb4ab]">
                                            Tài khoản của bạn đã bị khóa
                                        </h3>
                                        <button
                                            onClick={() => setBlockedInfo(null)}
                                            className="text-[#ffb4ab]/70 hover:text-white transition -mt-0.5"
                                            title="Đóng thông báo"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[12px] leading-[18px] text-[#e2e2eb]/90">
                                        Quyền truy cập đã bị tạm dừng bởi Quản trị viên.
                                    </p>
                                    <div className="mt-2.5 pt-2.5 border-t border-[#ffb4ab]/15 space-y-1.5 text-[12px]">
                                        <div className="flex items-center gap-1.5 text-[#ffb4ab]">
                                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                                            <span>
                                                Thời hạn: <strong className="text-white font-medium">{formatLockUntil(blockedInfo.until)}</strong>
                                            </span>
                                        </div>
                                        {blockedInfo.reason && (
                                            <div className="flex items-start gap-1.5 text-[#ffb4ab]/90">
                                                <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
                                                <span className="break-words">
                                                    Lý do: <span className="text-[#e2e2eb] italic">{blockedInfo.reason}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nút chính: Threads */}
                    <button
                        onClick={loginWithThreads}
                        disabled={loading}
                        className="group w-full h-12 rounded-xl bg-[#e2e2eb] hover:bg-white text-[#0c0e14] flex items-center justify-center gap-2.5 font-semibold text-[14px] shadow-[0_8px_24px_-8px_rgba(192,193,255,0.45)] transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0c1ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161d] disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 rounded-full border-2 border-[#0c0e14]/25 border-t-[#0c0e14] animate-spin" />
                                Đang kết nối...
                            </>
                        ) : (
                            <>
                                <img src={threadsLogo} alt="" aria-hidden="true" className="w-5 h-5 object-contain" />
                                Tiếp tục với Threads
                            </>
                        )}
                    </button>

                    {/* Phân cách */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="h-px flex-1 bg-white/[0.07]" />
                        <span className="text-[11px] uppercase tracking-[0.12em] text-[#6f6e80]">hoặc</span>
                        <div className="h-px flex-1 bg-white/[0.07]" />
                    </div>

                    {/* Nút phụ: Admin */}
                    <Link
                        to="/admin/login"
                        className="group w-full h-12 rounded-xl bg-white/[0.03] hover:bg-[#c0c1ff]/10 ring-1 ring-white/10 hover:ring-[#c0c1ff]/40 flex items-center justify-center gap-2 text-[14px] font-medium text-[#c7c4d7] hover:text-[#e1e0ff] transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0c1ff]"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#c0c1ff]">
                            admin_panel_settings
                        </span>
                        Đăng nhập Quản trị viên
                    </Link>
                </div>

                {/* Ghi chú nhỏ */}
                <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-[#6f6e80]">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Đăng nhập an toàn qua Threads OAuth
                </p>
            </main>
        </div>
    );
}