import {
    HashRouter,
    Routes,
    Route,
    Navigate,
    Outlet
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import OverviewPage from "../pages/OverviewPage";
import CommentsPage from '../pages/CommentsPage';
import StatisticsPage from '../pages/StatisticsPage';
import Header from '../components/layout/Header';
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;

    return children;
}

function AppLayout() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            <Header />
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <Outlet />
            </div>
        </div>
    );
}

function AppRouter() {
    return (
        <HashRouter>
            <Routes>

                {/* Public & Admin routes*/}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />


                {/* Protected User App */}
                <Route element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/comments" element={<CommentsPage />} />
                    <Route path="/statistics" element={<StatisticsPage />} />
                    <Route path="*" element={<Navigate to="/overview" replace />} />
                </Route>

            </Routes>
        </HashRouter>
    );
}

export default AppRouter;