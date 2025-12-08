import { Navigate } from "react-router-dom";
import { isActiveWithinHours } from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token || !isActiveWithinHours(24)) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
