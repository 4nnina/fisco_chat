import getToken from "./TokenAPI";
import { useState, useEffect } from "react";
import Loading from "../components/Loading";

function Auth({ children }: React.PropsWithChildren) {

    const [user, setUser] = useState<string | null | undefined>(undefined);
    
    useEffect(() => {
        async function fetchToken() {
            const user = await getToken();
            if (!user || !user.auth) {
                setUser(null);
            } else {
                setUser(user.user);
            }
        }
        fetchToken();
    }, []);
    
    if (user === undefined) return <Loading /> 
        if (user === null || user != "admin") {
        window.location.href = '/login';
        return;
    }
    return <>{children}</>;

}

export default Auth;