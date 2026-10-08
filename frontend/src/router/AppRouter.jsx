import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";

import { useAuth } from "../context/AuthContext";


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


function AppRouter() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/login"
                    element={<LoginPage />}
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

            </Routes>

        </BrowserRouter>
    );
}

export default AppRouter;