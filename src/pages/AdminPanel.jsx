import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

// Function to check admin
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

export default function AdminPanel() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({
    name: "",
    contentPreview: "",
    subject: "",
    videoUrl: "",
    restricted: false
  });
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: [],
    answer: 0,
    reason: "",
    explanationVideoUrl: ""
  });
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [subjects, setSubjects] = useState([]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/subjects");
      setSubjects(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      return [];
    }
  };

  const fetchChapters = async (subjectsList) => {
    try {
      // Assuming a general endpoint to get all chapters, or we need to get by subjects
      // For now, let's assume we can get all chapters
      const chapterPromises = subjectsList.length ? subjectsList.map(sub => api.get(`/subjects/${sub._id}/chapters`)) : [];
      const results = await Promise.all(chapterPromises);
      const allChapters = results.flatMap(res => res.data);
      setChapters(allChapters);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("Failed to fetch chapters:", err);
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    const loadData = async () => {
      const subs = await fetchSubjects();
      await fetchChapters(subs);
    };

    loadData();
  }, [navigate]);

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedChapter) {
        await api.put(`/chapters/${selectedChapter._id}`, chapterForm);
        alert("Chapter updated!");
      } else {
        await api.post(`/subjects/${chapterForm.subject}/chapters`, chapterForm);
        alert("Chapter created!");
      }
      setShowChapterForm(false);
      setSelectedChapter(null);
      setChapterForm({ name: "", contentPreview: "", subject: "", videoUrl: "", restricted: false });
      fetchChapters();
    } catch (err) {
      alert("Error saving chapter: " + err.message);
    }
  };

  const deleteChapter = async (id) => {
    if (!confirm("Delete chapter?")) return;
    try {
      await api.delete(`/chapters/${id}`);
      alert("Chapter deleted!");
      fetchChapters();
    } catch (err) {
      alert("Error deleting chapter: " + err.message);
    }
  };

  const editChapter = (chapter) => {
    setSelectedChapter(chapter);
    setChapterForm({
      name: chapter.name,
      contentPreview: chapter.contentPreview,
      subject: chapter.subject,
      videoUrl: chapter.videoUrl,
      restricted: chapter.restricted
    });
    setShowChapterForm(true);
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...questionForm,
        options: questionForm.options.split(',').map(s => s.trim()),
        type: 'mcq',
        answer: Number(questionForm.answer)
      };
      await api.post(`/chapters/${selectedChapter._id}/questions`, payload);
      alert("Question added!");
      setShowQuestionForm(false);
      setQuestionForm({ question: "", options: [], answer: 0, reason: "", explanationVideoUrl: "" });
      // Refresh chapter? But we don't have the chapter here yet
    } catch (err) {
      alert("Error adding question: " + err.message);
    }
  };

  if (!isAdmin) return null;

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Admin Panel</h1>

      <button onClick={() => { setShowChapterForm(true); setSelectedChapter(null); }}>Add New Chapter</button>

      {showChapterForm && (
        <form onSubmit={handleChapterSubmit}>
          <h3>{selectedChapter ? "Edit Chapter" : "New Chapter"}</h3>
          <input value={chapterForm.name} onChange={(e) => setChapterForm({...chapterForm, name: e.target.value})} placeholder="Chapter Name" required />
          <input value={chapterForm.contentPreview} onChange={(e) => setChapterForm({...chapterForm, contentPreview: e.target.value})} placeholder="Content Preview" />
          <select value={chapterForm.subject} onChange={(e) => setChapterForm({...chapterForm, subject: e.target.value})} required>
            <option value="">Select Subject</option>
            {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
          </select>
          <input value={chapterForm.videoUrl} onChange={(e) => setChapterForm({...chapterForm, videoUrl: e.target.value})} placeholder="Video URL" />
          <label>
            <input type="checkbox" checked={chapterForm.restricted} onChange={(e) => setChapterForm({...chapterForm, restricted: e.target.checked})} />
            Restricted
          </label>
          <button type="submit">{selectedChapter ? "Update" : "Create"}</button>
          <button type="button" onClick={() => setShowChapterForm(false)}>Cancel</button>
        </form>
      )}

      <h2>Chapters</h2>
      <ul>
        {chapters.map(ch => (
          <li key={ch._id}>
            {ch.name}
            <button onClick={() => editChapter(ch)}>Edit</button>
            <button onClick={() => { setSelectedChapter(ch); setShowQuestionForm(true); }}>Add Question</button>
            <button onClick={() => deleteChapter(ch._id)}>Delete</button>
          </li>
        ))}
      </ul>

      {showQuestionForm && selectedChapter && (
        <form onSubmit={handleQuestionSubmit}>
          <h3>Add Question to {selectedChapter.name}</h3>
          <input value={questionForm.question} onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})} placeholder="Question Text" required />
          <input value={questionForm.options} onChange={(e) => setQuestionForm({...questionForm, options: e.target.value})} placeholder="Options (comma separated)" required />
          <input value={questionForm.answer} onChange={(e) => setQuestionForm({...questionForm, answer: e.target.value})} placeholder="Correct Answer Index (0-based)" required />
          <input value={questionForm.reason} onChange={(e) => setQuestionForm({...questionForm, reason: e.target.value})} placeholder="Explanation" />
          <input value={questionForm.explanationVideoUrl} onChange={(e) => setQuestionForm({...questionForm, explanationVideoUrl: e.target.value})} placeholder="Explanation Video URL" />
          <button type="submit">Add Question</button>
          <button type="button" onClick={() => setShowQuestionForm(false)}>Cancel</button>
        </form>
      )}

      <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
    </div>
  );
}
