import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import "../assets/css/ChapterView.css";
import Signup from "./Signup";

const ChapterView = () => {
  const { id } = useParams();
  const inTextRef = useRef(null);

  const [chapter, setChapter] = useState(null);
  const [allChapters, setAllChapters] = useState([]);
  const [activeSection, setActiveSection] = useState("in-text"); // "in-text" or "test-yourself"
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [, setScrollCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const hasPaid = localStorage.getItem("paid") === "true"; // simulate payment status

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
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

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Admin add content states
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [addingMCQ, setAddingMCQ] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newAnswer, setNewAnswer] = useState(0);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const res = await api.get(`/chapters/${id}`);
        setChapter(res.data);
      } catch (err) {
        console.error("Error fetching chapter:", err);
      }
    };

    fetchChapter();
  }, [id]);

  useEffect(() => {
    if (chapter?.subject) {
      const fetchAllChapters = async () => {
        try {
          const res = await api.get(`/subjects/${chapter.subject._id || chapter.subject}/chapters`);
          setAllChapters(res.data);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching chapters:", err);
          setLoading(false);
        }
      };
      fetchAllChapters();
    }
  }, [chapter]);



  useEffect(() => {
    if (activeSection === "in-text" && !isAuthenticated && !showAuthModal) {
      const element = inTextRef.current;
      if (element) {
        const handleScroll = () => {
          setScrollCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              setShowAuthModal(true);
            }
            return newCount;
          });
        };
        element.addEventListener("scroll", handleScroll, { passive: true });
        return () => element.removeEventListener("scroll", handleScroll);
      }
    }
  }, [activeSection, isAuthenticated, showAuthModal]);

  if (loading) return <p className="p-4">Loading...</p>;
  if (!chapter) return <p className="p-4">Chapter not found.</p>;

  const content = (chapter.content && chapter.content.length && chapter.content) || [];
  const numCorrect = content.map((q, index) => answers[index] === q.answer ? 1 : 0).reduce((a, b) => a + b, 0);

  return (
    <div className="chapter-page">
      {/* Left Side Panel */}
      <div className="chapter-sidebar-left">
        <h3 className="sidebar-title">Chapters</h3>
        <div className="chapter-list">
          {allChapters
            .sort((a, b) => (a.number || 0) - (b.number || 0))
            .map(ch => (
            <div key={ch._id} className={`chapter-item-sidebar ${ch._id === id ? 'current' : ''}`}>
              <div
                className="chapter-link"
                onClick={() => window.location.href = `/chapter/${ch._id}`}
              >
                {ch.number}. {ch.title}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="chapter-main">
        <h1 className="chapter-heading">{chapter.name || chapter.title}</h1>

        {/* Section Links */}
        <div className="section-links">
          <button
            className={`section-link-btn ${activeSection === "in-text" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("in-text");
              setScrollCount(0);
              setShowAuthModal(false);
            }}
          >
            In-Text Solutions
          </button>
          <button
            className={`section-link-btn ${activeSection === "test-yourself" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("test-yourself");
              setShowAuthModal(false);
            }}
          >
            Test Yourself (MCQs)
          </button>
        </div>

      {/* Content */}
      {activeSection === "in-text" && (
        <div className="section-content" ref={inTextRef}>
          <h2 className="section-title">In-Text Solutions</h2>
          {chapter.videoUrl && (
            <div className="chapter-video-wrapper" style={{ marginBottom: 18 }}>
              <iframe
                title="chapter-video"
                src={chapter.videoUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: 420, borderRadius: 8 }}
              />
            </div>
          )}
          <div className="question-list">
            {content.map((q, index) => (
              <div key={q._id || index} className="question-item">
                <p>{index + 1}. {q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "test-yourself" && (
        <div className="section-content">
          <h2 className="section-title">Test Yourself (MCQs)</h2>
          {showResults ? (
            <div className="results">
              <h2>Results</h2>
              <p>You got {numCorrect} out of {content.length} correct.</p>
              {content.map((q, index) => (
                <div key={q._id || index} className="result-question">
                  <p><strong>Question {index + 1}:</strong> {q.question}</p>
                  <div className="answer-row">
                    <p className="your-answer">Your answer: {q.options?.[answers[index]] || 'Not answered'}</p>
                    <p className="correct-answer">Correct answer: {q.options?.[q.answer]}</p>
                  </div>
                  {q.reason && <p>Explanation: {q.reason}</p>}
                </div>
              ))}
              <button onClick={() => {
                setShowResults(false);
                setCurrentQuestion(0);
                setAnswers([]);
              }}>Retake Test</button>
            </div>
          ) : (
            <div className="mcq-test">
              {currentQuestion < content.length ? (
                <div className="question-block">
                  <p>Question {currentQuestion + 1}</p>
                  <p>{content[currentQuestion].question}</p>
                  <div className="mcq-options">
                    {content[currentQuestion].options?.map((op, i) => (
                      <button
                        key={i}
                        className={`mcq-option ${answers[currentQuestion] === i ? 'selected' : ''}`}
                        onClick={() => {
                          const newAnswers = [...answers];
                          newAnswers[currentQuestion] = i;
                          setAnswers(newAnswers);
                        }}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                  <div className="nav-buttons">
                    {currentQuestion > 0 && (
                      <button onClick={() => setCurrentQuestion(currentQuestion - 1)}>Previous</button>
                    )}
                    <button
                      onClick={() => {
                        if (currentQuestion === 0 && !hasPaid) {
                          setLocked(true);
                        } else if (currentQuestion < content.length - 1) {
                          setCurrentQuestion(currentQuestion + 1);
                        } else {
                          setShowResults(true);
                        }
                      }}
                    >
                      {currentQuestion < content.length - 1 ? 'Next' : 'Finish'}
                    </button>
                  </div>
                </div>
              ) : (
                <p>No questions available.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Content for Admin */}
      {isAdmin && (
        <div className="admin-add-content">
          {!addContentOpen && (
            <button onClick={() => setAddContentOpen(true)}>Add Content</button>
          )}
          {addContentOpen && (
            <div>
              <button onClick={() => setAddContentOpen(false)}>Close Add Content</button>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const body = { question: newQuestion, reason: newReason };
                if (addingMCQ) {
                  body.options = newOptions;
                  body.answer = parseInt(newAnswer);
                }
                try {
                  await api.post(`/chapters/${id}/questions`, body);
                  alert('Content added!');
                  window.location.reload(); // refresh to see new content
                } catch (err) {
                  console.error('Error adding content:', err);
                  alert('Failed to add content.');
                }
              }}>
                <label>
                  Question:
                  <textarea value={newQuestion} onChange={e => setNewQuestion(e.target.value)} required />
                </label>
                <br />
                <label>
                  <input type="checkbox" checked={addingMCQ} onChange={() => setAddingMCQ(!addingMCQ)} />
                  Add as MCQ
                </label>
                <br />
                {addingMCQ && (
                  <div>
                    Options (one per line):
                    {newOptions.map((op, i) => (
                      <input
                        key={i}
                        value={op}
                        onChange={e => setNewOptions(o => o.map((x, j) => j === i ? e.target.value : x))}
                        placeholder={`Option ${i + 1}`}
                      />
                    ))}
                    Correct Answer Index: <select value={newAnswer} onChange={e => setNewAnswer(parseInt(e.target.value))}>
                      <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                    </select>
                  </div>
                )}
                <br />
                <label>
                  Explanation/Reason:
                  <textarea value={newReason} onChange={e => setNewReason(e.target.value)} required />
                </label>
                <br />
                <button type="submit">Add Content</button>
              </form>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <Signup isModal={true} onSuccess={handleAuthSuccess} />
        </div>
      )}

      {/* Lock Overlay for Test after first question */}
      {locked && activeSection === "test-yourself" && (
        <div className="lock-overlay">
          <div className="lock-card">
            <h3>Unlock Full Test</h3>
            <p>Subscribe for Rs 99 to access all questions and results.</p>
            <button className="subscribe-btn" onClick={() => {
              localStorage.setItem("paid", "true");
              setLocked(false);
              alert("Payment successful!");
            }}>Subscribe - Rs 99</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterView;
