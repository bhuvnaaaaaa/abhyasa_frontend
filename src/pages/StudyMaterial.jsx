import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import logoImg from "../assets/images/logo.jpg";

export default function StudyMaterial() {
  const navigate = useNavigate();
  const [step, setStep] = useState("boards");
  const [boards, setBoards] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Subject display order
  const subjectOrder = ["Physics", "Chemistry", "Biology", "Mathematics", "Geography", "History", "Civics", "Economics", "English"];

  // Load boards on component mount
  useEffect(() => {
    const loadBoards = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const boardsRes = await api.get("/boards");
        setBoards(boardsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch boards", err);
        setErrorMessage("Could not load boards right now. Please refresh and try again.");
        setBoards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
  }, []);

  const chooseBoard = async (board) => {
    setSelectedBoard(board);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSubjects([]);
    setChapters([]);
    setStep("grades");
    setIsLoading(true);
    setErrorMessage("");
    try {
      const gradesRes = await api.get("/grades", { params: { board: board._id } });
      setGrades(gradesRes.data || []);
    } catch (err) {
      console.error("Failed to load grades", err);
      setErrorMessage("Could not load classes for this board.");
      setGrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  const chooseGrade = async (grade) => {
    setSelectedGrade(grade);
    setSelectedSubject(null);
    setChapters([]);
    setStep("subjects");
    setIsLoading(true);
    setErrorMessage("");
    try {
      const subjectsRes = await api.get("/subjects", {
        params: { board: selectedBoard?._id, grade: grade.grade },
      });
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error("Failed to load subjects", err);
      setErrorMessage("Could not load subjects for this class.");
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const chooseSubject = async (subject) => {
    setSelectedSubject(subject);
    setStep("chapters");
    setIsLoading(true);
    setErrorMessage("");
    try {
      const chaptersRes = await api.get(`/subjects/${subject._id}/chapters`);
      setChapters(chaptersRes.data || []);
    } catch (err) {
      console.error("Failed to load chapters", err);
      setErrorMessage("Could not load chapters for this subject.");
      setChapters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const goToChapter = (chapter) => {
    navigate(`/chapter/${chapter._id}`);
  };

  const orderedSubjects = subjects
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
        {isLoading && <p className="p-4">Loading content...</p>}
        {!isLoading && errorMessage && <p className="p-4">{errorMessage}</p>}

        {step === "boards" && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Your Board</h2>
            <div className="selection-grid">
              {boards.map((board) => (
                <div
                  key={board._id}
                  className="selection-card board-selection"
                  onClick={() => chooseBoard(board)}
                >
                  <h3>{board.name}</h3>
                  <p>Choose your educational board</p>
                </div>
              ))}
            </div>
            {!isLoading && !errorMessage && boards.length === 0 && (
              <p className="p-4">No boards available at the moment.</p>
            )}
          </div>
        )}

        {step === "grades" && selectedBoard && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Grade - {selectedBoard.name}</h2>
            <div className="selection-grid">
              {grades.map((grade) => (
                <div
                  key={grade._id}
                  className="selection-card grade-selection"
                  onClick={() => chooseGrade(grade)}
                >
                  <h3>Class {grade.grade}</h3>
                  <p>Grade {grade.grade} curriculum</p>
                </div>
              ))}
            </div>
            {!isLoading && !errorMessage && grades.length === 0 && (
              <p className="p-4">No classes found for this board.</p>
            )}
          </div>
        )}

        {step === "subjects" && selectedGrade && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Subject - {selectedBoard.name} Class {selectedGrade.grade}</h2>
            <div className="selection-grid">
              {orderedSubjects.map((subject) => (
                <div
                  key={subject._id}
                  className="selection-card subject-selection"
                  onClick={() => chooseSubject(subject)}
                >
                  <h3>{subject.name}</h3>
                  <p>{subject.description || `${subject.name} curriculum`}</p>
                </div>
              ))}
            </div>
            {!isLoading && !errorMessage && orderedSubjects.length === 0 && (
              <p className="p-4">No subjects available for this class yet.</p>
            )}
          </div>
        )}

        {step === "chapters" && selectedSubject && (
          <div className="dashboard-section">
            <h2 className="dashboard-title">Select Chapter - {selectedSubject.name}</h2>
            <div className="selection-grid">
              {chapters
                .sort((a, b) => (a.number || 0) - (b.number || 0))
                .map((chapter) => (
                  <div
                    key={chapter._id}
                    className="selection-card chapter-selection"
                    onClick={() => goToChapter(chapter)}
                  >
                    <h3>Chapter {chapter.number}</h3>
                    <p>{chapter.title || chapter.name || `Chapter ${chapter.number || ""}`}</p>
                  </div>
                ))}
            </div>
            {!isLoading && !errorMessage && chapters.length === 0 && (
              <p className="p-4">No chapters available for this subject.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
