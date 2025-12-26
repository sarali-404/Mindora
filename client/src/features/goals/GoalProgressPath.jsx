import styles from "./GoalProgressPath.module.css";

export default function GoalProgressPath({ currentStep, totalSteps }) {
  const steps = [
    { number: 1, label: "Target" },
    { number: 2, label: "Deadline" },
    { number: 3, label: "Materials" },
    { number: 4, label: "Review" },
  ];

  return (
    <div className={styles.progressPath}>
      <div className={styles.pathSteps}>
        {steps.map((step) => (
          <div key={step.number} className={styles.stepContainer}>
            <div className={styles.pathStepWrapper}>
              <div
                className={`${styles.pathStep} ${
                  step.number <= currentStep ? styles.pathStepActive : ""
                } ${step.number < currentStep ? styles.pathStepCompleted : ""}`}
              >
                {step.number < currentStep ? "✓" : step.number}
              </div>
              {step.number < 4 && (
                <div
                  className={`${styles.pathLine} ${
                    step.number < currentStep ? styles.pathLineActive : ""
                  }`}
                />
              )}
            </div>
            <span
              className={`${styles.stepLabel} ${
                currentStep === step.number ? styles.activeLabelText : ""
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
