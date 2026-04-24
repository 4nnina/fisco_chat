import { OrbitProgress } from "react-loading-indicators";

function Loading() {

    return <div className="flex items-center justify-center h-96">
            <OrbitProgress variant="spokes" color="#4289daff" size="medium" text="" textColor="" />
        </div>
}

export default Loading;