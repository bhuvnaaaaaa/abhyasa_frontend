import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../assets/css/style.css";
import api from "../api/axios";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allContent, setAllContent] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const searchRef = useRef(null);

  const navigate = useNavigate();

  // Load all content for search functionality
  useEffect(() => {
    const loadAllContent = async () => {
      try {
        // Fetch all subjects and their chapters
        const subjectsRes = await api.get("/subjects");
        const subjectsData = subjectsRes.data || [];

        const contentPromises = subjectsData.map(async (subject) => {
          try {
            const chaptersRes = await api.get(`/subjects/${subject._id}/chapters`);
            return (chaptersRes.data || []).map(chapter => ({
              ...chapter,
              subjectName: subject.name,
              boardName: subject.board,
              gradeName: subject.grade
            }));
          } catch {
            return [];
          }
        });

        const allChaptersArrays = await Promise.all(contentPromises);
        const flattenedChapters = allChaptersArrays.flat().sort((a, b) => {
          const numA = parseInt(a.number) || 0;
          const numB = parseInt(b.number) || 0;
          return numA - numB;
        });

        setAllContent(flattenedChapters);
      } catch (err) {
        console.error("Failed to load content for search", err);
      }
    };

    loadAllContent();
  }, []);

  // Handle search query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsLoadingSearch(true);

      // Search through all content
      const query = searchQuery.toLowerCase();
      const filteredResults = allContent.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query) ||
        item.subjectName?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      ).slice(0, 8); // Limit to 8 results

      setSearchResults(filteredResults);
      setShowSearchResults(true);
      setIsLoadingSearch(false);
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, allContent]);

  const handleSearchResultClick = (chapter) => {
    setShowSearchResults(false);
    setSearchQuery("");
    navigate(`/chapter/${chapter._id}`);
  };

  return (
    <>
      {/* The site-wide `Navbar` is rendered from `App.jsx`. Removed local header to avoid duplicate navbars. */}
      {/* HERO SECTION */}
      <section id="hero">
        <div className="hero-left">
          <h1>Welcome to Abhyasa</h1>
          <h2>
            <i>Your journey to knowledge begins here.</i>
          </h2>

          {/* Search Bar */}
          <div className="search-container" ref={searchRef}>
            <div className="search-input-wrapper">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input"
                placeholder="What do you wish to learn today?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              />
              {isLoadingSearch && <div className="search-loading">Searching...</div>}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((chapter) => (
                    <div
                      key={chapter._id}
                      className="search-result-item"
                      onClick={() => handleSearchResultClick(chapter)}
                    >
                      <div className="search-result-content">
                        <div className="search-result-title">
                          Chapter {chapter.number} • {chapter.title || chapter.name}
                        </div>
                        <div className="search-result-meta">
                          {chapter.subjectName}
                        </div>
                      </div>
                      <i className="fas fa-arrow-right search-result-icon"></i>
                    </div>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="search-no-results">
                    No results found for "{searchQuery}"
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <p className="hero-subtitle">Start your learning journey today!</p>
        </div>

        <div className="hero-illustration">
          <img
            src="/src/assets/images/Adobe Express - file.png"
            alt="Education Illustration"
          />
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about">
        <div className="about-left">
          <h2>About Us</h2>
          <p>
            Abhyasa has been a one-stop rostrum to help students in their
            after-school learning process by offering them a highly effective
            learning platform that aids them in clarifying their doubts through
            video explanations and solutions to textbook questions
          </p>

          <h2>Why Abhyasa?</h2>
          <p>
            Abhyasa aims to make the learning process more appealing and
            attention-grabbing to all learners. It is a unique quest for all
            student requirements in the learning process.
          </p>
          <p>
            It helps them to lay a strong foundation in understanding the basics
            of the subject and prepares them not only for the academic exams but
            also to succeed in competitive exams too.
          </p>
          <p>
            Furthermore, Abhyasa assists students in practising to write the
            correct answers and achieving maximum marks in minimal time by
            helping them understand the evaluation pattern.
          </p>
        </div>

        <div className="about-right" aria-hidden="true"></div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <div className="social-links">
          <a href="#">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="#">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="#">
            <i className="fab fa-linkedin-in"></i>
          </a>
        </div>

        <br />

        <div className="footer-contact-row">
          <div className="footer-contact-address">
            <h3>Contact Us</h3>

            <address>
              244/147, 2nd Floor, Behind Kedar Clinic, <br />
              Fulbag Galli,
              <br />
              Belagavi, Karnataka - 590006
            </address>
          </div>

          <div className="footer-contact-email">
            <h3>Email</h3>
            <a href="mailto:prashanthjagadeesh@gmail.com">
              prashanthjagadeesh@gmail.com
            </a>
            <br />
            <a href="mailto:bhuvanamallesh08@gmail.com">
              bhuvanamallesh08@gmail.com
            </a>
          </div>

          <div className="footer-contact-phone">
            <h3>Phone</h3>
            <a href="tel:+919916888184">+91 99168 88184</a>
            <br />
            <a href="tel:+916360594263">+91 63605 94263</a>
            <br />
          </div>
        </div>

        <p className="footer-copy">
          <b>&copy; 2025 Abhyasa. All rights reserved.</b>
        </p>
      </footer>
    </>
  );
}
