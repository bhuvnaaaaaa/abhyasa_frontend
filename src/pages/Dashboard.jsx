import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import logoImg from "../assets/images/logo.jpg";

export default function Dashboard() {
  const navigate = useNavigate();
  const [step, setStep] = useState("boards");
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [boards, setBoards] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [, setSelectedSubjectName] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const boardsRes = await api.get("/boards");
        setBoards(boardsRes.data || []);
        // Hardcode grades for simplicity
        setGrades([
          { grade: 6, _id: '6' },
          { grade: 7, _id: '7' },
          { grade: 8, _id: '8' },
          { grade: 9, _id: '9' },
          { grade: 10, _id: '10' }
        ]);
      } catch (err) {
        console.error("Failed to fetch boards", err);
        setBoards([]);
        setGrades([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (step === "subjects" && selectedBoard && selectedGrade) {
      const fetchSubjects = async () => {
        try {
          const subjectsRes = await api.get("/subjects", { params: { board: selectedBoard._id, grade: selectedGrade._id } });
          setSubjects(subjectsRes.data || []);
        } catch (err) {
          console.error("Failed to fetch subjects", err);
          setSubjects([]);
        }
      };
      fetchSubjects();
    }
  }, [step, selectedBoard, selectedGrade]);

  const chooseBoard = (board) => {
    setSelectedBoard(board);
    setStep("grades");
  };

  const chooseGrade = (grade) => {
    setSelectedGrade(grade);
    setStep("subjects");
  };

  const chooseSubject = (subject) => {
    setSelectedSubjectName(subject.name);
    setStep("chapters");
    // fetch chapters
    const fetchChapters = async () => {
      try {
        const res = await api.get(`/subjects/${subject._id}/chapters`);
        setChapters(res.data || []);
      } catch (err) {
        console.error("Failed to load chapters", err);
        setChapters([]);
      }
    };
    fetchChapters();
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
      setStep("boards");
      setSelectedBoard(null);
    } else if (step === "subjects") {
      setStep("grades");
      setSelectedGrade(null);
    } else if (step === "chapters") {
      setStep("subjects");
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

  const uniqueSubjects = subjects.filter((subject, index, self) =>
    index === self.findIndex(s => s.name === subject.name)
  );

  return (
    <div className="dashboard-container">
      {/* Background with blurred enlarged logo */}
      <div className="dashboard-background">
        <img src={logoImg} alt="Background Logo" className="dashboard-bg-logo" />
        <div className="dashboard-overlay"></div>
      </div>

      {/* Control Buttons */}
      <div className="dashboard-controls">
        {step !== "boards" && (
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
        {step === "boards" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Board</h2>
            <div className="dashboard-list dashboard-horizontal-list">
              {boards.map((board) => (
                <article
                  key={board._id}
                  className="dashboard-card board-card"
                  onClick={() => chooseBoard(board)}
                >
                  <div className="card-content">
                    <h3>{board.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {step === "subjects" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Subject</h2>
            <div className="dashboard-list">
              {uniqueSubjects.map((subject) => (
                <article
                  key={subject._id}
                  className="dashboard-card subject-card"
                  onClick={() => chooseSubject(subject)}
                >
                  <div className="card-content">
                    <h3>{subject.name} Study Material</h3>
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
              {chapters
                .sort((a, b) => (a.number || 0) - (b.number || 0))
                .map((c) => (
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
