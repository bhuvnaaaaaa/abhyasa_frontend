import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Navbar() {
  const navigate = useNavigate();
  const [classesOptions, setClassesOptions] = useState([]);
  const [showStudyMaterialDropdown, setShowStudyMaterialDropdown] = useState(false);

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
          <img src="src/assets/images/logo.jpg" alt="logo" onClick={()=> document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} />
        </div>

        <div id="nav-menu-container" className="nav-menu-container">
          <div className="nav-links-main">
            <a href="#hero">Home</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
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
            <Link to="/signup">
              <button>Sign Up</button>
            </Link>
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
