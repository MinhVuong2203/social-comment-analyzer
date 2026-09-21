import React, { useState, useEffect } from "react";

const FEATURES = [
  {
    icon: "dynamic_feed",
    iconBg: "bg-[#4cd7f6]/10",
    iconColor: "text-[#4cd7f6]",
    title: "Tự động phát hiện & cào replies",
    titleHover: "group-hover:text-[#4cd7f6]",
    badge: "Real-time",
    badgeBg: "bg-[#33343b]",
    badgeColor: "text-[#4cd7f6]",
    desc: "Đồng bộ với luồng cuộn trang Threads mà không làm đơ trình duyệt.",
  },
  {
    icon: "psychology",
    iconBg: "bg-[#c0c1ff]/10",
    iconColor: "text-[#c0c1ff]",
    title: "Phân loại cảm xúc & sắc thái",
    titleHover: "group-hover:text-[#c0c1ff]",
    badge: ">95.4% acc",
    badgeBg: "bg-[#c0c1ff]/15",
    badgeColor: "text-[#c0c1ff]",
    desc: "Mô hình PhoBERT giải mã ngữ cảnh tiếng Việt, tiếng lóng, mỉa mai (sarcasm).",
  },
  {
    icon: "shield",
    iconBg: "bg-[#ffb4ab]/10",
    iconColor: "text-[#ffb4ab]",
    title: "Phát hiện Toxic & Ngôn từ thù ghét",
    titleHover: "group-hover:text-[#ffb4ab]",
    badge: "Auto-flag",
    badgeBg: "bg-[#93000a]/30",
    badgeColor: "text-[#ffb4ab]",
    desc: "Cảnh báo công kích cá nhân, seeding links và nội dung quảng cáo rác tự động.",
  },
  {
    icon: "leaderboard",
    iconBg: "bg-[#4edea3]/10",
    iconColor: "text-[#4edea3]",
    title: "Thống kê & Xuất báo cáo",
    titleHover: "group-hover:text-[#4edea3]",
    badge: "CSV / JSON",
    badgeBg: "bg-[#33343b]",
    badgeColor: "text-[#4edea3]",
    desc: "Biểu đồ phân bố cảm xúc theo thời gian thực và trích xuất dữ liệu đa định dạng.",
  },
];

export default function SocialCommentAnalyzer() {
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [loginState, setLoginState] = useState("idle"); // idle | connecting | success
  const [guestClicked, setGuestClicked] = useState(false);

  // Nạp font Google (Material Symbols) một lần khi component mount.
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

  const handleLogin = () => {
    if (loginState !== "idle") return;
    setLoginState("connecting");
    setTimeout(() => setLoginState("success"), 1200);
  };

  const handleGuest = () => {
    setGuestClicked(true);
  };

  const handleSaveApiKey = () => {
    // TODO: gắn logic lưu API key thật (gọi API / localStorage / context...)
    console.log("Saved API key:", apiKeyValue);
  };

  const loginLabel =
    loginState === "connecting"
      ? "Đang kết nối Threads OAuth..."
      : loginState === "success"
      ? "Xác thực thành công!"
      : "Đăng nhập bằng Threads";

  return (
    <div className="bg-[#111319] font-['Inter'] text-[#e2e2eb] flex items-center justify-center min-h-screen">
      <main className="w-full max-w-md p-[0.75rem] bg-[#191b22] rounded-[0.5rem] shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col w-full text-[#e2e2eb] select-none relative overflow-hidden">
          {/* Subtle Ambient Glow Orbs */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#c0c1ff]/10 blur-3xl pointer-events-none" />
          <div className="absolute top-48 -right-16 w-56 h-56 rounded-full bg-[#4cd7f6]/10 blur-3xl pointer-events-none" />

          {/* Header & Brand Telemetry Bar */}
          <header className="flex items-center justify-between px-[0.625rem] py-[0.375rem] bg-[#0c0e14]/80 backdrop-blur-md rounded-[0.25rem] shadow-sm mb-[0.625rem]">
            <div className="flex items-center space-x-[0.25rem]">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold uppercase text-[#4edea3]">
                Engine Online
              </span>
            </div>
            <div className="flex items-center space-x-[0.25rem] text-[#c7c4d7] font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold">
              <span className="material-symbols-outlined text-[13px] text-[#4cd7f6]">
                memory
              </span>
              <span className="text-[#4cd7f6] font-medium">PhoBERT v2.4</span>
              <span className="text-[#464554]">•</span>
              <span className="text-[#c7c4d7]/80">LATENCY 18ms</span>
            </div>
          </header>

          {/* Hero Branding & Identity Card */}
          <section className="relative flex flex-col items-center text-center p-[0.875rem] bg-[#1e1f26]/60 backdrop-blur-md rounded-[0.5rem] shadow-md mb-[0.625rem] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#c0c1ff]/5 via-transparent to-[#0c0e14]/60 pointer-events-none" />

            {/* Logo with Multi-layer Glow */}
            <div className="relative mb-[0.625rem] group cursor-pointer">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#c0c1ff] via-[#4cd7f6] to-[#8083ff] rounded-[0.5rem] blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />
              <div className="relative w-16 h-16 rounded-[0.5rem] bg-[#0c0e14] flex items-center justify-center p-1 shadow-xl">
                <img
                  alt="Brand Logo Social Comment Analyzer"
                  className="w-full h-full object-contain rounded-[0.25rem] shadow-sm transform group-hover:scale-105 transition duration-300"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1Usa8OU1ik5dASEFdXhYxC7p28j2tR8NOk540gQ_dDp7ygWN4tOqPVdh4_chspeT8pcH5rXrznRTu5VGrt4WkSBJcdFRU3T9CT3q9ioML1TEBUg19BnXq7vXzzygiQDdSQfqFaUmBXRweFgL1nHarSrx0VlWEfnbgYCkyynKhPeGG4X7kx9o_QT1PRW5qcLY8NUOpWrOgWHDubTa9j83loWmP7VHv25027fd_edZx4q2yyopaWoDOWadlRq"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0c0e14] rounded-full flex items-center justify-center shadow">
                <span
                  className="material-symbols-outlined text-[12px] text-[#4edea3]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
              </div>
            </div>

            {/* Titles & Cognitive Tagline */}
            <h1 className="font-['Plus_Jakarta_Sans'] text-[16px] leading-[22px] tracking-[-0.01em] font-semibold text-[#e2e2eb] mb-[0.25rem]">
              Social Comment Analyzer
            </h1>
            <div className="inline-flex items-center space-x-[0.25rem] px-[0.375rem] py-0.5 rounded-full bg-[#c0c1ff]/10 text-[#e1e0ff] mb-[0.375rem]">
              <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold uppercase">
                AI Intelligence for Threads
              </span>
            </div>
            <p className="font-['Inter'] text-[12px] leading-[16px] text-[#c7c4d7] max-w-[340px] leading-relaxed">
              Khám phá insight ngầm từ hàng nghìn thảo luận với mô hình học sâu{" "}
              <strong className="text-[#4cd7f6] font-medium">
                PhoBERT tiếng Việt
              </strong>{" "}
              tối ưu cho mạng xã hội Threads.
            </p>
          </section>

          {/* Primary Action Container: Threads Auth Button */}
          <section className="flex flex-col mb-[0.625rem]">
            <button
              onClick={handleLogin}
              disabled={loginState !== "idle"}
              className={`group relative w-full h-12 rounded-[0.25rem] bg-[#0c0e14] flex items-center justify-between px-[0.875rem] overflow-hidden shadow-lg transition-all duration-300 hover:bg-[#33343b] active:scale-[0.99] focus:outline-none ${
                loginState !== "idle" ? "opacity-80 pointer-events-none" : ""
              }`}
            >
              {/* Interactive Shimmer & Neon Backdrop */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#c0c1ff]/15 via-[#4cd7f6]/15 to-[#8083ff]/15 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-[#e1e0ff]/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000" />

              {/* Icon & Text Group */}
              <div className="relative flex items-center space-x-[0.625rem] z-10">
                <div className="w-7 h-7 rounded-full bg-[#e2e2eb] flex items-center justify-center shadow">
                  <svg
                    className="w-4 h-4 fill-[#0c0e14]"
                    viewBox="0 0 192 192"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.3129 71.9723C80.9576 63.4072 89.9238 60.4206 97.2144 60.4206C97.2917 60.4206 97.3698 60.4206 97.4478 60.4213C108.435 60.4907 117.206 67.2403 120.301 80.9574C112.593 79.7997 104.382 79.5298 96.0645 80.2079C66.8625 82.5852 47.9009 98.4905 48.7845 120.941C49.5262 139.795 64.9818 152.483 83.9452 152.483C99.2319 152.483 111.458 144.385 118.528 132.827C124.088 143.927 133.684 150.016 148.163 150.016C163.666 150.016 174.978 140.354 178.694 123.633C182.261 107.579 178.475 90.0461 168.04 74.3409C152.395 50.7961 127.351 37.071 96.883 37.071C60.3361 37.071 31.854 60.2741 26.2447 94.6067C20.6702 128.718 39.5232 161.71 71.0772 173.064C76.9935 175.193 83.1813 176.326 89.4795 176.435V160.758C84.4449 160.671 79.4975 159.766 74.7709 158.065C49.9149 149.123 35.0643 123.13 39.4549 96.2505C43.8647 69.2486 66.294 51.0538 95.0744 51.0538C119.066 51.0538 138.781 61.8584 151.102 80.4079C159.324 92.7876 162.296 106.637 159.487 119.261C156.919 130.8 149.444 136.035 139.754 136.035C130.658 136.035 124.161 130.669 122.569 120.443C132.84 109.845 138.835 97.4526 141.537 88.9883ZM94.8877 137.608C82.5292 137.608 72.8436 129.805 72.3551 117.388C71.7455 101.895 86.1362 93.3039 104.664 91.7951C110.155 91.3481 115.545 91.5034 120.686 92.2359C117.848 122.428 106.657 137.608 94.8877 137.608Z" />
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[18px] font-semibold text-[#e2e2eb] tracking-tight group-hover:text-[#c0c1ff] transition-colors">
                    {loginLabel}
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold text-[#c7c4d7]">
                    OAuth 2.0 cấp quyền đọc bảo mật
                  </span>
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="relative z-10 w-7 h-7 rounded-full bg-[#1e1f26] flex items-center justify-center text-[#c0c1ff] group-hover:translate-x-1 group-hover:bg-[#c0c1ff] group-hover:text-[#1000a9] transition-all">
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </div>
            </button>

            {/* Trust Micro-Notice */}
            <div className="flex items-center justify-center space-x-1.5 mt-[0.25rem] text-[#c7c4d7]/70 text-center">
              <span className="material-symbols-outlined text-[12px] text-[#4edea3]">
                lock
              </span>
              <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold">
                Kết nối trực tiếp qua Threads OAuth API. Không bao giờ lưu mật
                khẩu.
              </span>
            </div>
          </section>

          {/* Feature Highlights (Bento Grid Mini Stack) */}
          <section className="flex flex-col space-y-[0.25rem] mb-[0.625rem]">
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold uppercase text-[#908fa0]">
                Tính năng cốt lõi PRO
              </span>
              <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold text-[#4cd7f6] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6]" /> 4
                Module sẵn sàng
              </span>
            </div>

            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start p-[0.375rem] bg-[#1e1f26] rounded-[0.25rem] transition hover:bg-[#282a30] group"
              >
                <div
                  className={`w-8 h-8 rounded ${f.iconBg} flex items-center justify-center ${f.iconColor} mr-[0.625rem] shrink-0`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {f.icon}
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h2
                      className={`font-['Inter'] text-[13px] leading-[18px] tracking-[-0.005em] font-medium text-[#e2e2eb] font-semibold truncate transition-colors ${f.titleHover}`}
                    >
                      {f.title}
                    </h2>
                    <span
                      className={`font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold px-1.5 py-0.5 rounded ${f.badgeBg} ${f.badgeColor} shrink-0`}
                    >
                      {f.badge}
                    </span>
                  </div>
                  <p className="font-['Inter'] text-[11px] leading-[14px] tracking-[0.01em] text-[#c7c4d7] mt-0.5 line-clamp-1">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Alternative Entry Paths (Guest / API Key) */}
          <section className="flex flex-col space-y-[0.25rem] mb-[0.625rem]">
            {/* Guest Demo Mode */}
            <button
              onClick={handleGuest}
              disabled={guestClicked}
              className={`w-full py-[0.375rem] px-[0.625rem] bg-[#282a30] hover:bg-[#33343b] rounded-[0.25rem] flex items-center justify-center space-x-[0.25rem] text-[#e2e2eb] transition active:scale-[0.99] ${
                guestClicked ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[15px] text-[#c7c4d7]">
                visibility
              </span>
              <span className="font-['Inter'] text-[11px] leading-[14px] tracking-[0.01em] font-medium">
                {guestClicked
                  ? "Đang khởi tạo phiên Khách..."
                  : "Tiếp tục với tư cách Khách (Chế độ dùng thử 15 bài)"}
              </span>
            </button>

            {/* Custom API Key Mode Accordion Toggle */}
            <div className="bg-[#0c0e14] rounded-[0.25rem] p-[0.375rem]">
              <button
                onClick={() => setApiKeyOpen((v) => !v)}
                className="w-full flex items-center justify-between text-left text-[#c7c4d7] hover:text-[#e2e2eb] transition"
              >
                <div className="flex items-center space-x-[0.25rem]">
                  <span className="material-symbols-outlined text-[14px] text-[#c0c1ff]">
                    key
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold">
                    Đăng nhập bằng PhoBERT API Key riêng
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-[14px] transition-transform duration-200"
                  style={{
                    transform: apiKeyOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  expand_more
                </span>
              </button>

              {apiKeyOpen && (
                <div className="mt-[0.375rem] flex flex-col space-y-[0.25rem] pt-[0.25rem]">
                  <div className="relative flex items-center">
                    <input
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      className="w-full h-[30px] bg-[#1e1f26] px-[0.375rem] font-['JetBrains_Mono'] text-[10px] leading-[12px] tracking-[0.02em] font-medium text-[#e2e2eb] placeholder:text-[#908fa0]/40 rounded focus:outline-none focus:bg-[#282a30] transition"
                      placeholder="sca_live_xxxxxxxxxxxxxxxx"
                      type="password"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      className="absolute right-1 px-2 py-0.5 bg-[#c0c1ff] text-[#1000a9] rounded font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold hover:bg-[#8083ff] transition"
                    >
                      Lưu
                    </button>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold text-[#908fa0]">
                    Dành cho nhà nghiên cứu hoặc tài khoản Enterprise tự host
                    mô hình.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Live Status & Telemetry Footer */}
          <footer className="flex flex-col pt-[0.25rem] bg-[#0c0e14]/60 rounded-[0.25rem] p-[0.375rem] space-y-[0.25rem]">
            <div className="flex items-center justify-between text-[#908fa0]">
              <div className="flex items-center space-x-1 font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold">
                <span className="text-[#e2e2eb] font-semibold">
                  Phiên bản v2.1.4 PRO
                </span>
                <span>•</span>
                <span className="text-[#4edea3] inline-flex items-center">
                  <span className="material-symbols-outlined text-[11px] mr-0.5">
                    verified_user
                  </span>
                  E2E Encrypted
                </span>
              </div>
              <div className="flex items-center space-x-[0.375rem] font-['JetBrains_Mono'] text-[9px] leading-[10px] tracking-[0.04em] font-semibold">
                <a className="hover:text-[#c0c1ff] transition-colors" href="#terms">
                  Điều khoản
                </a>
                <span>•</span>
                <a className="hover:text-[#c0c1ff] transition-colors" href="#docs">
                  Tài liệu API
                </a>
                <span>•</span>
                <a className="hover:text-[#c0c1ff] transition-colors" href="#help">
                  Trợ giúp
                </a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}