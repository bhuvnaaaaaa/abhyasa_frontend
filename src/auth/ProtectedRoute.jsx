import { Navigate, useLocation } from "react-router-dom";
import { isActiveWithinHours } from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token || !isActiveWithinHours(48)) {
    localStorage.removeItem("token");
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: "Please log in to continue.",
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
