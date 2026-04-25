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
      } catch (err) {
        console.error("Failed to fetch boards", err);
        setBoards([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (step === "subjects" && selectedBoard && selectedGrade) {
      const fetchSubjects = async () => {
        try {
          const subjectsRes = await api.get("/subjects", { params: { board: selectedBoard._id, grade: selectedGrade.grade } });
          setSubjects(subjectsRes.data || []);
        } catch (err) {
          console.error("Failed to fetch subjects", err);
          setSubjects([]);
        }
      };
      fetchSubjects();
    }
  }, [step, selectedBoard, selectedGrade]);

  const chooseBoard = async (board) => {
    setSelectedBoard(board);
    setStep("grades");
    try {
      const gradesRes = await api.get("/grades", { params: { board: board._id } });
      setGrades(gradesRes.data || []);
    } catch (err) {
      console.error("Failed to load grades", err);
      setGrades([]);
    }
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

  const uniqueSubjects = subjects.filter((subject, index, self) =>
    index === self.findIndex(s => s.name === subject.name)
  );
  
  // Custom subject order: Biology, Chemistry, Physics, Geography
  const subjectOrder = ['Biology', 'Chemistry', 'Physics', 'Geography'];
  const orderedSubjects = uniqueSubjects
    .filter(subject => subjectOrder.includes(subject.name))
    .sort((a, b) => subjectOrder.indexOf(a.name) - subjectOrder.indexOf(b.name));

  return (
    <div className="dashboard-container">
      {/* Background with blurred enlarged logo */}
      <div className="dashboard-background">
        <img src={logoImg} alt="Background Logo" className="dashboard-bg-logo" />
        <div className="dashboard-overlay"></div>
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
              {orderedSubjects.map((subject) => (
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
