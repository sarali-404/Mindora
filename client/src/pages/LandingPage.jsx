import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaRobot, FaBullseye, FaChartLine, FaUsers, FaBook, FaClock, FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Lottie from "lottie-react";
import styles from "./LandingPage.module.css";
import LoginModal from "../components/auth/LoginModal";
import RegisterModal from "../components/auth/RegisterModal";

// Import achievement images
import firstStepsImg from "../assets/achievements/first_steps.png";
import readingBirdImg from "../assets/achievements/reading_bird.png";
import quizMasterImg from "../assets/achievements/quiz_master.png";
import streakMasterImg from "../assets/achievements/streak_master.png";
import goalCrusherImg from "../assets/achievements/goal_crusher.png";
import memoryMasterImg from "../assets/achievements/memory_master.png";
import teachingBirdImg from "../assets/achievements/teaching_bird.png";
import goalArchitectImg from "../assets/achievements/goal_architect.png";
import birdBaseAnimation from "../assets/animations/bird-base.json";



// Animated Counter Component
function AnimatedCounter({ endValue, duration = 2000, suffix = "" }) {
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
          const startTime = Date.now();
          const startValue = 0;
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
            
            setCurrentValue(current);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`counter-${endValue}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [endValue, duration, hasAnimated]);

  return (
    <span id={`counter-${endValue}`}>
      {currentValue.toLocaleString()}{suffix}
    </span>
  );
}

// Testimonials Carousel Component
function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: "Aisha Perera",
      role: "2nd Year Engineering",
      text: "Mindora transformed my study habits.",
      rating: 5
    },
    {
      name: "Rohan Silva",
      role: "Final Year Medicine",
      text: "Best platform for organized learning.",
      rating: 5
    },
    {
      name: "Priya Kumari",
      role: "3rd Year Commerce",
      text: "Love the goal tracking feature.",
      rating: 5
    },
    {
      name: "Nihal Jayawardena",
      role: "2nd Year Law",
      text: "Community features keep me motivated.",
      rating: 5
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const getVisibleTestimonials = () => {
    const visibleCount = 3;
    const visible = [];
    for (let i = 0; i < visibleCount; i++) {
      visible.push(testimonials[(currentIndex + i) % testimonials.length]);
    }
    return visible;
  };

  return (
    <div className={styles.testimonialsWrapper}>
      <button onClick={prevSlide} className={styles.navButton} aria-label="Previous">
        <FaChevronLeft />
      </button>
      
      <div className={styles.testimonialsGrid}>
        {getVisibleTestimonials().map((testimonial, idx) => (
          <div key={idx} className={styles.testimonialCard}>
            <div className={styles.testimonialStars}>
              {[...Array(testimonial.rating)].map((_, i) => (
                <FaStar key={i} className={styles.starIcon} />
              ))}
            </div>
            <p className={styles.testimonialText}>"{testimonial.text}"</p>
            <p className={styles.testimonialName}>{testimonial.name}</p>
            <p className={styles.testimonialRole}>{testimonial.role}</p>
          </div>
        ))}
      </div>

      <button onClick={nextSlide} className={styles.navButton} aria-label="Next">
        <FaChevronRight />
      </button>
    </div>
  );
}

// Achievements Carousel Component
function AchievementsCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);

  const achievements = [
    { name: "First Steps", img: firstStepsImg },
    { name: "Reading Bird", img: readingBirdImg },
    { name: "Quiz Master", img: quizMasterImg },
    { name: "Streak Master", img: streakMasterImg },
    { name: "Goal Crusher", img: goalCrusherImg },
    { name: "Memory Master", img: memoryMasterImg },
    { name: "Teaching Bird", img: teachingBirdImg },
    { name: "Goal Architect", img: goalArchitectImg },
  ];

  return (
    <div 
      className={styles.achievementsContainer}
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={`${styles.achievementsScroll} ${isPaused ? styles.scrollPaused : ""}`}>
        {[...achievements, ...achievements, ...achievements].map((achievement, idx) => (
          <div key={idx} className={styles.achievementBird}>
            <img 
              src={achievement.img} 
              alt={achievement.name}
              className={styles.birdImage}
            />
            <p className={styles.birdName}>{achievement.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      navigate('/app/dashboard', { replace: true });
    }
  }, []);

  useEffect(() => {
    if (animationStarted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnimationStarted(true);
          // Cycle: 1 → 2 → 3, then stop
          const stepDur = 1000; // ms per step (sped up from 2500)
          setActiveStep(1);

          const t1 = setTimeout(() => setActiveStep(2), stepDur);
          const t2 = setTimeout(() => setActiveStep(3), stepDur * 2);

          // Cleanup timeouts
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      },
      { threshold: 0.3 }
    );

    const howSection = document.querySelector('[data-section="how-it-works"]');
    if (howSection) {
      observer.observe(howSection);
    }

    return () => {
      observer.disconnect();
    };
  }, [animationStarted]);

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleSignupClick = () => {
    setShowRegisterModal(true);
  };

  const handleCloseLogin = () => {
    setShowLoginModal(false);
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseRegister = () => {
    setShowRegisterModal(false);
  };

  return (
    <div className={styles.page}>
      {/* Glass Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          {/* Logo */}
          <div className={styles.navLogo}>
            <img src="/logo-small.png" alt="Mindora" className={styles.logoImage} />
          </div>

          {/* Auth Buttons */}
          <div className={styles.navAuth}>
            <button className={styles.loginBtn} onClick={handleLoginClick}>Login</button>
            <button className={styles.signupBtn} onClick={handleSignupClick}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className={styles.hero}>
        <p className={styles.heroBadge}>
          Specially for Sri Lankan undergraduates
        </p>

        <h1 className={styles.heroTitle}>
          Study smarter with{" "}
          <span className={styles.heroHighlight}>Mindora</span>
        </h1>

        <p className={styles.heroText}>
          Study smarter with AI notes, goal tracking, and community learning.
        </p>

        <div className={styles.heroActions}>
          <button className={styles.primaryButton}>Get Started</button>
          <button className={styles.secondaryButton}>Learn More</button>
        </div>

        {/* Stats integrated into hero */}
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <p className={styles.heroStatNumber}>
              <AnimatedCounter endValue={2500} suffix="+" />
            </p>
            <p className={styles.heroStatLabel}>Active learners</p>
          </div>
          <div className={styles.heroStat}>
            <p className={styles.heroStatNumber}>
              <AnimatedCounter endValue={15000} suffix="+" />
            </p>
            <p className={styles.heroStatLabel}>Learning goals</p>
          </div>
          <div className={styles.heroStat}>
            <p className={styles.heroStatNumber}>
              <AnimatedCounter endValue={98} suffix="%" />
            </p>
            <p className={styles.heroStatLabel}>Satisfaction rate</p>
          </div>
        </div>
      </header>
      {/* Features */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Everything You Need</h2>
          <p className={styles.sectionSubtitle}>
            Smart tools for smart learners.
          </p>
        </div>

        <div className={styles.featuresWrapper}>
          <div className={styles.featuresLeft}>
            <div className={styles.featureGrid}>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FaRobot />
                </div>
                <h3 className={styles.featureTitle}>AI Notes</h3>
                <p className={styles.featureText}>
                  Get personalized study summaries powered by AI.
                </p>
              </article>

              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FaBullseye />
                </div>
                <h3 className={styles.featureTitle}>Smart Goals</h3>
                <p className={styles.featureText}>
                  Set goals and track progress with ease.
                </p>
              </article>

              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FaChartLine />
                </div>
                <h3 className={styles.featureTitle}>Analytics</h3>
                <p className={styles.featureText}>
                  See your learning progress visualized.
                </p>
              </article>

              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FaUsers />
                </div>
                <h3 className={styles.featureTitle}>Community</h3>
                <p className={styles.featureText}>
                  Learn and grow with your peers.
                </p>
              </article>
            </div>
          </div>

          <div className={styles.featureAnimation}>
            <Lottie animationData={birdBaseAnimation} loop={true} className={styles.featureLottie} />
          </div>
        </div>
      </section>

            {/* How It Works – staggered layout with dotted path */}
      <section className={styles.howSection} data-section="how-it-works">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Three simple steps to start learning.
          </p>
        </div>

        <div className={styles.howTimelineWrapper}>
          {/* Staggered steps */}
          <div className={styles.howStepsLayer}>
            <div
              className={`${styles.howStepText} ${styles.howStep1} ${
                activeStep === 1 ? styles.howStepActive : ""
              } ${activeStep > 1 ? styles.howStepCompleted : ""}`}
            >
              <p className={styles.howStepLabel}>Step 01</p>
              <h3 className={styles.howStepTitle}>Set Goals</h3>
              <p className={styles.howStepBody}>
                Define what you want to learn.
              </p>
            </div>

            <div
              className={`${styles.howStepText} ${styles.howStep2} ${
                activeStep === 2 ? styles.howStepActive : ""
              } ${activeStep > 2 ? styles.howStepCompleted : ""}`}
            >
              <p className={styles.howStepLabel}>Step 02</p>
              <h3 className={styles.howStepTitle}>Learn & Track</h3>
              <p className={styles.howStepBody}>
                Follow your path and see progress.
              </p>
            </div>

            <div
              className={`${styles.howStepText} ${styles.howStep3} ${
                activeStep === 3 ? styles.howStepActive : ""
              }`}
            >
              <p className={styles.howStepLabel}>Step 03</p>
              <h3 className={styles.howStepTitle}>Succeed</h3>
              <p className={styles.howStepBody}>
                Achieve goals and earn recognition.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials Carousel Section */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Loved by Students</h2>
          <p className={styles.sectionSubtitle}>
            See what our learners say about Mindora.
          </p>
        </div>
        <TestimonialsCarousel />
      </section>

      {/* Achievements Section */}
      <section className={styles.achievementsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Become a Special Bird</h2>
          <p className={styles.sectionSubtitle}>
            Unlock unique achievements as you learn.
          </p>
        </div>
        <AchievementsCarousel />
      </section>

      {/* Why Choose + CTA */}
      <section className={styles.whySection}>
        <div className={styles.whyLeft}>
          <h2 className={styles.sectionTitle}>Why Choose Mindora?</h2>
          <ul className={styles.checklist}>
            <li>AI-powered personalized learning</li>
            <li>Track progress easily</li>
            <li>Clear goal-setting tools</li>
            <li>Learn with your community</li>
            <li>All resources in one place</li>
          </ul>
        </div>

        <aside className={styles.ctaCard}>
          <h3 className={styles.ctaTitle}>Ready to Start?</h3>
          <p className={styles.ctaText}>
            Create your account now and begin your learning journey.
          </p>
          <button className={styles.primaryButton}>Get Started Free</button>
        </aside>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Mindora</span>
        <span className={styles.footerCopy}>© 2025 Mindora. All rights reserved.</span>
      </footer>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={handleCloseLogin} 
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* Register Modal */}
      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={handleCloseRegister} 
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}
