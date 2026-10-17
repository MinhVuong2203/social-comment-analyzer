import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    Outlet
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import HomePage from "../pages/HomePage";
import OverviewPage from "../pages/OverviewPage";

import { useAuth } from "../context/AuthContext";

import CommentsPage from '../pages/CommentsPage'
import Header from '../components/layout/Header'


function ProtectedRoute({ children }) {

    const {
        user,
        loading
    } = useAuth();


    if (loading) {

        return (
            <div>
                Đang kiểm tra đăng nhập...
            </div>
        );
    }


    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }


    return children;
}

// Layout chung: Header cố định + nội dung thay đổi bên dưới
function AppLayout() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header />
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Outlet />
            </div>
        </div>
    );
}


function AppRouter() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    path="/admin/login"
                    element={<AdminLoginPage />}
                />

                <Route
                    path="/admin"
                    element={
                        <Navigate
                            to="/admin/login"
                            replace
                        />
                    }
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <HomePage />
                        </ProtectedRoute>
                    }
                />


                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

                <Route element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/comments" element={<CommentsPage />} />
                    
                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default AppRouter;