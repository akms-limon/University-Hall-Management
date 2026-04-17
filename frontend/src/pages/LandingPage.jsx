import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import moznuPhoto from "@/assets/moznu.jpg";
import smrHallImage from "@/assets/smrhall.jpg";
import UniversityLogo from "@/components/shared/UniversityLogo";
import { publicApi } from "@/api/publicApi";
import { appMeta } from "@/lib/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import "./LandingPage.css";

const defaultHomepageData = {
  provost: null,
  notices: [],
  activities: [],
  summary: {
    students: 0,
    staff: 0,
    rooms: 0,
    notices: 0,
  },
};

const facilityItems = [
  {
    title: "হল লাইব্রেরী (Hall Library)",
    description:
      "The hall library supports academic study with regular book access, reference materials, and supervised reading support.",
  },
  {
    title: "ডাইনিং সিস্টেম (Dining Mess)",
    description:
      "Residential students receive organized daily meal services through hall dining operations and student support workflows.",
  },
  {
    title: "Students' Centre",
    description:
      "A dedicated student centre encourages cultural, social, and collaborative activities for a vibrant hall life.",
  },
  {
    title: "হল বাগান (Hall Garden)",
    description:
      "The hall garden is maintained to create a healthy, green and pleasant environment for residents.",
  },
  {
    title: "Internet & Computing",
    description:
      "Digital services support learning, communication, and administrative access for students and staff.",
  },
  {
    title: "Sports & Recreation",
    description:
      "Hall students actively participate in sports and recreational programs throughout the academic year.",
  },
];

function formatDateParts(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return { day: "01", mon: "Jan" };
  }
  return {
    day: String(date.getDate()).padStart(2, "0"),
    mon: date.toLocaleString("en-US", { month: "short" }),
  };
}

function LandingPage() {
  const [homepageData, setHomepageData] = useState(defaultHomepageData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const loadHomepage = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await publicApi.getHomepageData();
      setHomepageData({
        provost: payload.provost || null,
        notices: payload.notices || [],
        activities: payload.activities || [],
        summary: payload.summary || defaultHomepageData.summary,
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Unable to load homepage data."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomepage();
  }, [loadHomepage]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileNavOpen(false);
      }
    };
    const handleHashChange = () => {
      setIsMobileNavOpen(false);
    };
    const handleOutsideClick = (event) => {
      if (!isMobileNavOpen) return;
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("hashchange", handleHashChange);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isMobileNavOpen]);

  const recentNotices = useMemo(() => homepageData.notices.slice(0, 4), [homepageData.notices]);
  const upcomingEvents = useMemo(() => {
    const events = homepageData.activities.filter((item) => item.category === "event");
    return (events.length ? events : homepageData.activities).slice(0, 3);
  }, [homepageData.activities]);
  const heroMessage = homepageData.provost
    ? `${homepageData.provost.name}, ${homepageData.provost.designation}`
    : "Provost Office";

  return (
    <div className="classic-page">
      <nav className="classic-nav">
        <div className="nav-inner">
          <a href="#home" className="nav-logo">
            <div className="nav-emblem" aria-hidden="true">
              <UniversityLogo
                className="nav-emblem-logo"
                fallbackClassName="nav-emblem-logo-fallback"
                alt={`${appMeta.universityName} logo`}
              />
            </div>
            <div className="nav-title">
              {appMeta.hallName}
              <span>{appMeta.universityName}</span>
            </div>
          </a>
          <div className="nav-mobile" ref={mobileMenuRef}>
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={isMobileNavOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
            >
              {isMobileNavOpen ? "Close" : "Menu"}
            </button>
            <div
              className={`nav-links${isMobileNavOpen ? " open" : ""}`}
              onClick={(event) => {
                if (event.target.closest("a")) {
                  setIsMobileNavOpen(false);
                }
              }}
            >
              <a href="#about">About</a>
              <a href="#notices">Notices</a>
              <a href="#facilities">Facilities</a>
              <a href="#administration">Administration</a>
              <a href="#contact">Contact</a>
              <Link to="/login">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero" id="home" style={{ "--hero-bg-image": `url(${smrHallImage})` }}>
        <div className="hero-pattern" />
        <div className="hero-inner">
          <div className="hero-main">
            <div className="hero-badge">Residential Hall Portal</div>
            <h1>
              {appMeta.hallName}
              <br />
              <em>{appMeta.universityName}</em>
            </h1>
            <p className="hero-sub">
              A modern, structured and student-focused hall platform for notices, activities, administration, and hall services.
            </p>
            <div className="hero-buttons">
              <a href="#about" className="btn-primary">Explore the Hall</a>
              <a href="#notices" className="btn-outline">View Notices</a>
            </div>
          </div>

          <div className="hero-card">
            <img src={moznuPhoto} alt="Provost portrait" className="hero-card-photo" />
            <div className="hero-card-label">Message from the Provost</div>
            <h3>{heroMessage}</h3>
            <p>
              We are committed to maintaining a disciplined, inclusive and academically supportive residential environment for all students.
            </p>
            <hr className="hero-card-divider" />
            <div className="provost-name">{homepageData.provost?.name || "Provost Office"}</div>
            <div className="provost-title">{homepageData.provost?.designation || "Hall Administration"}</div>
          </div>
        </div>
      </section>

      <div className="stats-strip">
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-num">{homepageData.summary.rooms}</span>
            <div className="stat-label">Rooms</div>
          </div>
          <div className="stat-item">
            <span className="stat-num">{homepageData.summary.students}</span>
            <div className="stat-label">Students</div>
          </div>
          <div className="stat-item">
            <span className="stat-num">{homepageData.summary.staff}</span>
            <div className="stat-label">Staff</div>
          </div>
          <div className="stat-item">
            <span className="stat-num">{homepageData.summary.notices}</span>
            <div className="stat-label">Published Notices</div>
          </div>
        </div>
      </div>

      <section className="about-section" id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <div className="section-eyebrow">Our History</div>
              <h2 className="section-title">A Hall of Academic and Residential Excellence</h2>
              <div className="divider-gold" />
              <p>
                {appMeta.hallName} is a residential hall of {appMeta.universityName}, designed to support students through accommodation, discipline, and academic-friendly administration.
              </p>
              <p>
                The hall continues to strengthen student services through digital workflows, transparent notice communication, and active administrative monitoring.
              </p>
              <p>
                Our mission is to ensure secure and well-managed residential life where students can focus on academic progress and community values.
              </p>
            </div>
            <div>
              <div className="section-eyebrow">Key Milestones</div>
              <h2 className="section-title timeline-title">Hall Timeline</h2>
              <div className="divider-gold" />
              <div className="about-timeline">
                <div className="timeline-item">
                  <div className="timeline-dot">01</div>
                  <div className="timeline-content">
                    <h4>Hall Foundation</h4>
                    <p>Established to provide safe and organized residential support for university students.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot">02</div>
                  <div className="timeline-content">
                    <h4>Infrastructure Expansion</h4>
                    <p>Administrative and residential facilities expanded to serve a larger student population.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot">03</div>
                  <div className="timeline-content">
                    <h4>Digital Hall Services</h4>
                    <p>Notice, room, support, and service workflows are being transformed through a modern web platform.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="notices-section" id="notices">
        <div className="container">
          <div className="section-eyebrow">Stay Updated</div>
          <h2 className="section-title">Notices & Upcoming Events</h2>
          <div className="divider-gold" />
          {error ? <div className="load-state error">{error}</div> : null}
          {isLoading ? <div className="load-state">Loading notices and events...</div> : null}
          {!isLoading ? (
            <div className="notices-grid">
              <div>
                <h3 className="mini-title">Recent Notices</h3>
                <div className="notice-list">
                  {recentNotices.length ? (
                    recentNotices.map((notice) => {
                      const { day, mon } = formatDateParts(notice.publishedDate);
                      return (
                        <div className="notice-item" key={notice.id}>
                          <div className="notice-date">
                            <span className="day">{day}</span>
                            <span className="mon">{mon}</span>
                          </div>
                          <div className="notice-body">
                            <span className="notice-tag">{notice.category || "notice"}</span>
                            <h4>{notice.title}</h4>
                            <p>{notice.content?.slice(0, 120) || "Hall notice update."}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="notice-item">
                      <div className="notice-body">
                        <h4>No notices yet</h4>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="mini-title">Upcoming Events</h3>
                <div className="notice-list">
                  {upcomingEvents.length ? (
                    upcomingEvents.map((item) => {
                      const { day, mon } = formatDateParts(item.publishedDate);
                      return (
                        <div className="notice-item" key={`${item.id}-event`}>
                          <div className="notice-date highlight">
                            <span className="day">{day}</span>
                            <span className="mon">{mon}</span>
                          </div>
                          <div className="notice-body">
                            <span className="notice-tag highlight">event</span>
                            <h4>{item.title}</h4>
                            <p>{item.content?.slice(0, 120) || "Upcoming hall event."}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="notice-item">
                      <div className="notice-body">
                        <h4>No events announced</h4>
                        <p>Upcoming events will appear once published.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="facilities-section" id="facilities">
        <div className="container">
          <div className="section-eyebrow">What We Offer</div>
          <h2 className="section-title">Hall Facilities</h2>
          <div className="divider-gold" />
          <div className="facilities-grid">
            {facilityItems.map((item) => (
              <div className="facility-card" key={item.title}>
                <div className="facility-icon">+</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-section" id="administration">
        <div className="container">
          <div className="section-eyebrow">Hall Leadership</div>
          <h2 className="section-title">Administration</h2>
          <div className="divider-gold" />
          <p className="section-lead">
            The hall is managed by the provost office with staff and tutor support to ensure disciplined and responsive operations.
          </p>
          <div className="admin-cards">
            <div className="admin-card">
              <div className="admin-avatar">P</div>
              <h4>{homepageData.provost?.name || "Provost Office"}</h4>
              <div className="role">{homepageData.provost?.designation || "Provost"}</div>
              <div className="dept">{appMeta.universityName}</div>
            </div>
            <div className="admin-card">
              <div className="admin-avatar">HT</div>
              <h4>House Tutors</h4>
              <div className="role">Residential Supervision</div>
              <div className="dept">Academic Faculty Members</div>
            </div>
            <div className="admin-card">
              <div className="admin-avatar">AHT</div>
              <h4>Assistant House Tutors</h4>
              <div className="role">Administrative Support</div>
              <div className="dept">Academic Faculty Members</div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="container">
          <div className="section-eyebrow">Get In Touch</div>
          <h2 className="section-title">Contact Us</h2>
          <div className="divider-gold" />
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-row">
                <div className="contact-icon">A</div>
                <div>
                  <h4>Address</h4>
                  <p>{appMeta.hallName}<br />{appMeta.universityName} Campus</p>
                </div>
              </div>
              <div className="contact-row">
                <div className="contact-icon">P</div>
                <div>
                  <h4>Phone</h4>
                  <p>{homepageData.provost?.phone || "+880 0000 000000"}</p>
                </div>
              </div>
              <div className="contact-row">
                <div className="contact-icon">E</div>
                <div>
                  <h4>Email</h4>
                  <p>{homepageData.provost?.email || "hall-office@example.com"}</p>
                </div>
              </div>
            </div>
            <div>
              <div className="map-placeholder">
                <span>Map Placeholder</span>
                <span>{appMeta.universityName} Campus</span>
              </div>
              <div className="contact-actions">
                <Link to="/login" className="action-link dark">Student Login</Link>
                <a href="#home" className="action-link light">Hall Home</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div>
            <div className="footer-logo-text">{appMeta.hallName}</div>
            <p className="footer-desc">
              Official hall portal for notices, services, administration and student residential support.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#about">About the Hall</a></li>
              <li><a href="#notices">Notices</a></li>
              <li><a href="#facilities">Facilities</a></li>
            </ul>
          </div>
          <div>
            <h4>Administration</h4>
            <ul>
              <li><a href="#administration">Provost Office</a></li>
              <li><a href="#administration">House Tutors</a></li>
              <li><a href="#administration">Student Affairs</a></li>
              <li><a href="#administration">Hall Office</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><Link to="/login">Login</Link></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#notices">Notice Board</a></li>
              <li><a href="#home">Home</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 {appMeta.hallName}. All rights reserved.</span>
          <span>{appMeta.universityName} Campus</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
