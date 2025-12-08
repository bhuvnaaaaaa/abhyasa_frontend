import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import logoImg from "../assets/images/logo.jpg";

export default function StudyMaterial() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("classes");
  const [classesOptions, setClassesOptions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [, setSelectedSubject] = useState(null);

  const chooseClass = async (classValue) => {
    setSelectedClass(classValue);
    setStep("subjects");
    const [boardId, gradeId] = classValue.split('-');
    try {
      const subjectsRes = await api.get("/subjects", { params: { board: boardId, grade: gradeId } });
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load subjects", err);
      setSubjects([]);
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
              boardId: board._id,
              gradeId: grade._id,
              value: `${board._id}-${grade._id}`
            });
          });
        });
        setClassesOptions(options);

        const urlParams = new URLSearchParams(location.search);
        const classParam = urlParams.get('class');
        if (classParam) {
          chooseClass(classParam);
        }
      } catch (err) {
        console.error("Failed to fetch boards or grades", err);
        setClassesOptions([]);
      }
    };
    loadClasses();
  }, [location.search]);

  const chooseSubject = async (s) => {
    setSelectedSubject(s);
    setStep("chapters");
    try {
      const res = await api.get(`/subjects/${s._id}/chapters`);
      setChapters(res.data || []);
    } catch (err) {
      console.error("Failed to load chapters", err);
      setChapters([]);
    }
  };

  // Check if user is admin
  const isAdmin = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const payload = JSON.parse(atob(parts[1]));
      return payload.role === 'admin';
    } catch {
      return false;
    }
  })();

  const goToChapter = (ch) => {
    navigate(`/chapter/${ch._id}`);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed", err);
    }
    localStorage.removeItem("token");
    navigate("/login");
  };

  const goBack = () => {
    if (step === "subjects") {
      setStep("classes");
      setSelectedClass("");
    } else if (step === "chapters") {
      setStep("subjects");
      setSelectedSubject(null);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Background with blurred enlarged logo */}
      <div className="dashboard-background">
        <img src={logoImg} alt="Background Logo" className="dashboard-bg-logo" />
        <div className="dashboard-overlay"></div>
      </div>

      {/* Control Buttons */}
      <div className="dashboard-controls">
        {step !== "classes" && (
          <button onClick={goBack} className="dashboard-back-btn">
            <span className="btn-icon">←</span>
            <span>Back</span>
          </button>
        )}
        {isAdmin && (
          <button onClick={() => navigate("/admin")} className="dashboard-back-btn">
            <span>Admin Panel</span>
            <span className="btn-icon">⚙</span>
          </button>
        )}
        <button onClick={logout} className="dashboard-logout-btn">
          <span>Logout</span>
          <span className="btn-icon">⏻</span>
        </button>
      </div>

      {/* Content Container */}
      <div className="dashboard-content">
        {step === "classes" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Class</h2>
            <select
              value={selectedClass}
              onChange={(e) => chooseClass(e.target.value)}
              className="dashboard-select"
            >
              <option value="">Choose a class</option>
              {classesOptions.map((cls) => (
                <option key={cls.value} value={cls.value}>
                  {cls.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === "subjects" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Subject</h2>
            <select
              onChange={(e) => chooseSubject(subjects.find(s => s._id === e.target.value))}
              className="dashboard-select"
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === "chapters" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select a Chapter</h2>
            <select
              onChange={(e) => goToChapter(chapters.find(c => c._id === e.target.value))}
              className="dashboard-select"
            >
              <option value="">Choose a chapter</option>
              {chapters.map((c) => (
                <option key={c._id} value={c._id}>
                  {`Chapter ${c.number}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
