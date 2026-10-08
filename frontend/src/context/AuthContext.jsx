import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    getCurrentUser,
    logout as logoutService
} from "../services/authService";


const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [loading, setLoading] =
        useState(true);


    /*
     * Kiểm tra session khi React khởi động
     */
    useEffect(() => {

        const checkAuth = async () => {

            try {

                const currentUser =
                    await getCurrentUser();

                setUser(currentUser);

            } catch (error) {

                console.error(
                    "Auth error:",
                    error
                );

                setUser(null);

            } finally {

                setLoading(false);
            }
        };


        checkAuth();

    }, []);


    const logout = async () => {

        try {

            await logoutService();

            setUser(null);

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );
        }
    };


    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => {

    return useContext(AuthContext);

};