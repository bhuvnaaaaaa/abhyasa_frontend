import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import logoImg from "../assets/images/logo.jpg";

export default function Dashboard() {
  const navigate = useNavigate();
  const [step, setStep] = useState("subjects");
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const boardsRes = await api.get("/boards");
        const board = boardsRes.data.find(b => b.name === 'ICSE');
        if (board) {
          setSelectedBoard(board);
          const subjectsRes = await api.get("/subjects", { params: { board: board._id, grade: 6 } });
          setSubjects(subjectsRes.data || []);
        // Hardcode ICSE grades for simplicity
        setGrades(
          [
            { grade: 6, _id: '6' },
            { grade: 7, _id: '7' },
            { grade: 8, _id: '8' },
            { grade: 9, _id: '9' },
            { grade: 10, _id: '10' }
          ]
        );
        }
      } catch (err) {
        console.error("Failed to fetch board and subjects", err);
        setSubjects([]);
        setGrades([]);
      }
    };
    loadData();
  }, []);

  const chooseSubject = (subject) => {
    const subjectName = typeof subject === 'string' ? subject : subject.name;
    setSelectedSubjectName(subjectName);
    setStep("grades");
  };

  const chooseGrade = async (grade) => {
    try {
      const subjectsRes = await api.get("/subjects", { params: { board: selectedBoard._id, grade: grade._id } });
      const s = subjectsRes.data.find(subj => subj.name === selectedSubjectName);
      if (s) {
        const res = await api.get(`/subjects/${s._id}/chapters`);
        setChapters(res.data || []);
      }
      setStep("chapters");
    } catch (err) {
      console.error("Failed to load chapters", err);
      setChapters([]);
    }
  };

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
    if (step === "grades") {
      setStep("subjects");
      setSelectedSubjectName("");
    } else if (step === "chapters") {
      setStep("grades");
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

  const uniqueSubjectNames = [...new Set(subjects.map(s => s.name))];

  return (
    <div className="dashboard-container">
      {/* Background with blurred enlarged logo */}
      <div className="dashboard-background">
        <img src={logoImg} alt="Background Logo" className="dashboard-bg-logo" />
        <div className="dashboard-overlay"></div>
      </div>

      {/* Control Buttons */}
      <div className="dashboard-controls">
        {step !== "subjects" && (
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
        {step === "subjects" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Subject</h2>
            <div className="dashboard-list">
              {uniqueSubjectNames.map((subjName) => (
                <article
                  key={subjName}
                  className="dashboard-card subject-card"
                  onClick={() => chooseSubject(subjName)}
                >
                  <div className="card-content">
                    <h3>{subjName} Study Material</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {step === "grades" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Class</h2>
            <div className="dashboard-list">
              {grades.map((grade) => (
                <article
                  key={grade._id}
                  className="dashboard-card grade-card"
                  onClick={() => chooseGrade(grade)}
                >
                  <div className="card-content">
                    <h3>Grade {grade.grade} {selectedBoard?.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {step === "chapters" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select a Chapter</h2>
            <div className="dashboard-list">
              {chapters.map((c) => (
                <article
                  key={c._id}
                  className="dashboard-card chapter-card"
                  onClick={() => goToChapter(c)}
                >
                  <div className="card-content">
                    <p className="chapter-number">Chapter {c.number || c._id}</p>
                    <h3 className="chapter-title">{c.title || c.name || `Chapter ${c.number}`}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
