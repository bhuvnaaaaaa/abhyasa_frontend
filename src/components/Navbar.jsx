import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { getToken } from "../utils/auth";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [classesOptions, setClassesOptions] = useState([]);
  const [showStudyMaterialDropdown, setShowStudyMaterialDropdown] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());

  const handleHomeClick = () => {
    if (location.pathname === "/") {
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate("/");
    }
  };

  const handleAboutClick = () => {
    if (location.pathname === "/") {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate("/#about");
    }
  };

  const handleContactClick = () => {
    if (location.pathname === "/") {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate("/#contact");
    }
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const boardsRes = await api.get("/boards");
        const gradesRes = await api.get("/grades");
        const boards = boardsRes.data || [];
        const grades = gradesRes.data || [];
        const options = [];
        boards.forEach(board => {
          grades.filter(g => g.board === board._id).forEach(grade => {
            options.push({
              label: `${board.name} Class ${grade.grade}`,
              value: `${board._id}-${grade._id}`
            });
          });
        });
        setClassesOptions(options);
      } catch (err) {
        console.error("Failed to fetch boards or grades", err);
        setClassesOptions([]);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const mobileMenu = document.getElementById("mobile-menu");
    const navMenuContainer = document.getElementById("nav-menu-container");

    if (mobileMenu && navMenuContainer) {
      const toggleMenu = () => {
        navMenuContainer.classList.toggle("active");
      };

      mobileMenu.addEventListener("click", toggleMenu);

      return () => {
        mobileMenu.removeEventListener("click", toggleMenu);
      };
    }
  }, []);

  return (
    <header>
      <nav>
        <div className="logo">
          <img src="src/assets/images/logo.jpg" alt="logo" onClick={handleHomeClick} style={{cursor: 'pointer'}} />
        </div>

        <div id="nav-menu-container" className="nav-menu-container">
          <div className="nav-links-main">
            <a href="#" onClick={(e) => { e.preventDefault(); handleHomeClick(); }}>Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleAboutClick(); }}>About</a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleContactClick(); }}>Contact</a>
            <div className="dropdown">
              <span className="dropdown-toggle" onClick={() => { setShowStudyMaterialDropdown(!showStudyMaterialDropdown); navigate('/study-material'); }}>
                Study Material
              </span>
              {showStudyMaterialDropdown && (
                <div className="dropdown-menu">
                  {classesOptions.map((cls) => (
                    <div
                      key={cls.value}
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/study-material?class=${cls.value}`);
                        setShowStudyMaterialDropdown(false);
                      }}
                    >
                      {cls.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="nav-buttons">
            {isLoggedIn ? (
              <>
                <button onClick={async () => {
                  try {
                    await api.post("/auth/logout");
                  } catch (err) {
                    console.warn("Logout request failed", err);
                  }
                  localStorage.removeItem("token");
                  localStorage.removeItem("hasPaid");
                  setIsLoggedIn(false);
                  navigate("/");
                }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button>Login</button>
                </Link>
                <Link to="/signup">
                  <button>Sign Up</button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div id="mobile-menu" className="menu-toggle">
          ☰
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
