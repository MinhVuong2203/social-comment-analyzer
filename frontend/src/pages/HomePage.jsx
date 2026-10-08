import { useAuth } from "../context/AuthContext";

import {
    logout
} from "../services/authService";

import "../assets/styles/HomePage.css";


function HomePage() {

    const {
        user,
        logout: logoutContext
    } = useAuth();


    const handleLogout = async () => {

        await logoutContext();

        window.location.href =
            "/login";
    };


    if (!user) {
        return null;
    }


    return (
        <div className="home-page">

            {/* Navbar */}
            <nav className="navbar">

                <div className="navbar-logo">
                    Social Comment Analyzer
                </div>


                <div className="navbar-user">

                    <span>
                        @{user.username}
                    </span>

                    <button
                        onClick={handleLogout}
                    >
                        Đăng xuất
                    </button>

                </div>

            </nav>


            {/* Main */}
            <main className="home-content">

                <div className="welcome">

                    <h1>
                        Xin chào,{" "}
                        {user.name ||
                            `@${user.username}`}
                        !
                    </h1>

                    <p>
                        Chào mừng bạn đến với
                        Social Comment Analyzer.
                    </p>

                </div>


                {/* User Card */}
                <div className="user-card">

                    <div className="profile-section">

                        {user.profilePicture ? (

                            <img
                                src={
                                    user.profilePicture
                                }
                                alt="Profile"
                                className="profile-image"
                            />

                        ) : (

                            <div className="profile-placeholder">
                                {user.username
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                            </div>

                        )}


                        <div>

                            <h2>
                                {user.name ||
                                    "Threads User"}
                            </h2>

                            <p>
                                @{user.username}
                            </p>

                        </div>

                    </div>


                    <div className="user-info">

                        <div className="info-item">

                            <span>
                                Threads User ID
                            </span>

                            <strong>
                                {user.id}
                            </strong>

                        </div>


                        <div className="info-item">

                            <span>
                                Username
                            </span>

                            <strong>
                                @{user.username}
                            </strong>

                        </div>


                        <div className="info-item">

                            <span>
                                Trạng thái
                            </span>

                            <strong className="status">
                                Đã kết nối Threads
                            </strong>

                        </div>

                    </div>

                </div>


                {/* Feature */}
                <div className="feature-grid">

                    <div className="feature-card">

                        <h3>
                            📝 Bài viết
                        </h3>

                        <p>
                            Xem các bài viết
                            trên tài khoản Threads.
                        </p>

                    </div>


                    <div className="feature-card">

                        <h3>
                            💬 Bình luận
                        </h3>

                        <p>
                            Thu thập và phân tích
                            bình luận trên bài viết.
                        </p>

                    </div>


                    <div className="feature-card">

                        <h3>
                            🤖 PhoBERT
                        </h3>

                        <p>
                            Phân loại bình luận
                            bằng mô hình AI.
                        </p>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default HomePage;