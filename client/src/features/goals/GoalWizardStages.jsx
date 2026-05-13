import styles from "./GoalWizardStages.module.css";
import {
  MdFlag,
  MdCalendarToday,
  MdBook,
  MdCheckCircle,
  MdAccessTime,
  MdUploadFile,
  MdDescription,
  MdClose,
  MdLightbulb,
  MdAutoAwesome,
} from "react-icons/md";

export default function GoalWizardStages({
  currentStep,
  formData,
  handleChange,
  handleGoalTitleChange,
  handleFileUpload,
  removeFile,
  calculateDaysLeft,
  suggestions = [],
  showSuggestions = false,
  loadingSuggestions = false,
  selectSuggestion,
  setShowSuggestions,
}) {
  return (
    <div className={styles.stageContainer}>
      {/* Stage 1: What's Your Target? */}
      {currentStep === 1 && (
        <div className={styles.stage}>
          <div className={styles.stageTitleRow}>
            <MdFlag className={styles.stageIcon} style={{ color: '#10b981' }} />
            <h2 className={styles.stageTitle}>What&apos;s Your Target?</h2>
          </div>
          <p className={styles.stageSubtitle}>
            Define your learning goal clearly
          </p>

          <div className={styles.stageContent}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Your Goal</label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.inputLarge}
                  placeholder="e.g., Get 80+ marks in Algorithm"
                  value={formData.goalTitle}
                  onChange={(e) => handleGoalTitleChange ? handleGoalTitleChange(e.target.value) : handleChange("goalTitle", e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions && setShowSuggestions(false), 200)}
                  autoFocus
                />
                {loadingSuggestions && (
                  <span className={styles.loadingIndicator}><MdAutoAwesome size={16} /></span>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className={styles.suggestionsDropdown}>
                    <div className={styles.suggestionsHeader}>
                      <MdLightbulb style={{ color: '#f59e0b' }} />
                      <span>AI Suggestions</span>
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className={styles.suggestionItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion && selectSuggestion(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Subject</label>
              <input
                type="text"
                className={styles.inputLarge}
                placeholder="e.g., Algorithm"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
              />
              <p className={styles.helperText}>
                Each goal focuses on one subject
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: When's Your Deadline? */}
      {currentStep === 2 && (
        <div className={styles.stage}>
          <div className={styles.stageTitleRow}>
            <MdCalendarToday className={styles.stageIcon} style={{ color: '#f59e0b' }} />
            <h2 className={styles.stageTitle}>When&apos;s Your Deadline?</h2>
          </div>
          <p className={styles.stageSubtitle}>Set a realistic target date</p>

          <div className={styles.stageContent}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target Date</label>
              <input
                type="date"
                className={styles.inputLarge}
                value={formData.deadline}
                onChange={(e) => handleChange("deadline", e.target.value)}
                autoFocus
              />
            </div>

            {formData.deadline && (
              <div className={styles.countdownBox}>
                <div className={styles.countdownIcon}><MdAccessTime style={{ color: '#f59e0b' }} /></div>
                <div>
                  <p className={styles.countdownNumber}>
                    {calculateDaysLeft()} days
                  </p>
                  <p className={styles.countdownText}>
                    Time to reach your goal
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage 3: Add Your Materials */}
      {currentStep === 3 && (
        <div className={styles.stage}>
          <div className={styles.stageTitleRow}>
            <MdBook className={styles.stageIcon} style={{ color: '#8b5cf6' }} />
            <h2 className={styles.stageTitle}>Add Your Materials</h2>
          </div>
          <p className={styles.stageSubtitle}>
            Upload study materials from your device
          </p>

          <div className={styles.stageContent}>
            <div className={styles.uploadZone}>
              <input
                type="file"
                id="fileUpload"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileUpload}
                className={styles.fileInput}
              />
              <label htmlFor="fileUpload" className={styles.uploadLabel}>
                <div className={styles.uploadIcon}><MdUploadFile style={{ color: '#0073a0' }} /></div>
                <p className={styles.uploadTitle}>Click to upload materials</p>
                <p className={styles.uploadSubtitle}>
                  PDF, DOC, PPT, TXT (Max 50MB each)
                </p>
              </label>
            </div>

            {formData.materials.length > 0 && (
              <div className={styles.filesList}>
                <p className={styles.filesHeader}>
                  Uploaded Files ({formData.materials.length})
                </p>
                {formData.materials.map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <span className={styles.fileName}><MdDescription style={{ marginRight: 6, color: '#3b82f6' }} />{file.name}</span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeFile(index)}
                      aria-label="Remove file"
                    >
                      <MdClose />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className={styles.helperText}>
              <MdLightbulb style={{ verticalAlign: 'middle', marginRight: 6, color: '#f59e0b' }} /> 
            </p>
          </div>
        </div>
      )}

      {/* Stage 4: Review & Launch */}
      {currentStep === 4 && (
        <div className={styles.stage}>
          <div className={styles.stageTitleRow}>
            <MdCheckCircle className={styles.stageIcon} style={{ color: '#10b981' }} />
            <h2 className={styles.stageTitle}>Review & Launch</h2>
          </div>
          <p className={styles.stageSubtitle}>
            Everything looks good? Let&apos;s start your journey!
          </p>

          <div className={styles.stageContent}>
            <div className={styles.reviewCard}>
              <div className={styles.reviewGrid}>
                <div className={styles.reviewRow}>
                  <div className={styles.reviewLabel}>Goal</div>
                  <div className={styles.reviewValue}>
                    {formData.goalTitle || "—"}
                  </div>
                </div>

                <div className={styles.reviewRow}>
                  <div className={styles.reviewLabel}>Subject</div>
                  <div className={styles.reviewValue}>{formData.subject || "—"}</div>
                </div>

                <div className={styles.reviewRow}>
                  <div className={styles.reviewLabel}>Deadline</div>
                  <div className={styles.reviewValue}>
                    {formData.deadline
                      ? `${new Date(formData.deadline).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })} (${calculateDaysLeft()} days)`
                      : "—"}
                  </div>
                </div>

                <div className={styles.reviewRow}>
                  <div className={styles.reviewLabel}>Materials</div>
                  <div className={styles.reviewValue}>
                    {formData.materials.length} file(s) uploaded
                  </div>
                </div>
              </div>
            </div>

           
          </div>
        </div>
      )}
    </div>
  );
}
