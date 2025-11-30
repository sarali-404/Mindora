import { useState, useEffect } from "react";
import styles from "./LandingPage.module.css";



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

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    if (animationStarted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnimationStarted(true);
          // Cycle: 1 → 2 → 3, then stop
          const stepDur = 2500; // ms per step
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
            <button className={styles.loginBtn}>Login</button>
            <button className={styles.signupBtn}>Sign Up</button>
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
          Achieve your learning goals with personalized study plans, AI‑powered
          notes, and progress tracking that adapts to your learning pace.
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
          <h2 className={styles.sectionTitle}>Everything You Need to Succeed</h2>
          <p className={styles.sectionSubtitle}>
            Comprehensive tools to support your learning journey from start to finish.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>AI‑Powered Learning</h3>
            <p className={styles.featureText}>
              Get personalized learning recommendations and AI‑generated study
              materials tailored to your goals.
            </p>
          </article>

          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Goal‑Based Learning</h3>
            <p className={styles.featureText}>
              Set clear learning objectives and track your progress with structured
              milestones.
            </p>
          </article>

          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Progress Analytics</h3>
            <p className={styles.featureText}>
              Visualize your learning journey with detailed insights and performance
              metrics.
            </p>
          </article>

          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Learning Community</h3>
            <p className={styles.featureText}>
              Connect with peers, share knowledge, and collaborate on learning projects.
            </p>
          </article>

          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Resource Library</h3>
            <p className={styles.featureText}>
              Access organized study materials, notes, and AI‑generated summaries.
            </p>
          </article>

          <article className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Study Sessions</h3>
            <p className={styles.featureText}>
              Plan and track your focused study sessions to build consistent habits.
            </p>
          </article>
        </div>
      </section>

            {/* How It Works – staggered layout with dotted path */}
      <section className={styles.howSection} data-section="how-it-works">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Start your learning journey in three simple steps.
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
              <h3 className={styles.howStepTitle}>Set Your Goals</h3>
              <p className={styles.howStepBody}>
                Define what you want to learn and set clear, achievable milestones
                for your educational journey.
              </p>
            </div>

            <div
              className={`${styles.howStepText} ${styles.howStep2} ${
                activeStep === 2 ? styles.howStepActive : ""
              } ${activeStep > 2 ? styles.howStepCompleted : ""}`}
            >
              <p className={styles.howStepLabel}>Step 02</p>
              <h3 className={styles.howStepTitle}>Learn &amp; Track</h3>
              <p className={styles.howStepBody}>
                Follow your personalized learning path, complete tasks, and monitor
                your progress with detailed analytics.
              </p>
            </div>

            <div
              className={`${styles.howStepText} ${styles.howStep3} ${
                activeStep === 3 ? styles.howStepActive : ""
              }`}
            >
              <p className={styles.howStepLabel}>Step 03</p>
              <h3 className={styles.howStepTitle}>Achieve Success</h3>
              <p className={styles.howStepBody}>
                Reach your learning objectives, earn recognition, and build expertise
                in your chosen subjects.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Why Choose + CTA */}
      <section className={styles.whySection}>
        <div className={styles.whyLeft}>
          <h2 className={styles.sectionTitle}>Why Choose Mindora?</h2>
          <ul className={styles.checklist}>
            <li>AI‑powered personalized learning paths</li>
            <li>Track progress with detailed analytics</li>
            <li>Structured goal‑setting framework</li>
            <li>Collaborative learning community</li>
            <li>Comprehensive resource management</li>
          </ul>
        </div>

        <aside className={styles.ctaCard}>
          <h3 className={styles.ctaTitle}>Ready to Get Started?</h3>
          <p className={styles.ctaText}>
            Create your account and start learning smarter today.
          </p>
          <button className={styles.primaryButton}>Get Started Free</button>
        </aside>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Mindora</span>
        <span className={styles.footerCopy}>© 2025 Mindora. All rights reserved.</span>
      </footer>
    </div>
  );
}
