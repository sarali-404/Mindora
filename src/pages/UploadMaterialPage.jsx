import { useNavigate } from "react-router-dom";
import styles from "./UploadMaterialPage.module.css";

export default function UploadMaterialPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // later: handle upload
  };

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate("/app/library")}
      >
        ← Back to Library
      </button>

      {/* header removed per request; search is on Library page */}

      <div className={styles.shell}>
        {/* Steps (upload flow) */}
        <section className={styles.steps} aria-hidden={false}>
          <div className={styles.step}>
            <div className={styles.stepCircle}>1</div>
            <div className={styles.stepLabel}>Upload your file</div>
          </div>

          <div className={styles.stepConnector} />

          <div className={styles.step}>
            <div className={styles.stepCircle}>2</div>
            <div className={styles.stepLabel}>Fill the details and submit it</div>
          </div>

          <div className={styles.stepConnector} />

          <div className={styles.step}>
            <div className={styles.stepCircle}>3</div>
            <div className={styles.stepLabel}>Get recognition and share</div>
          </div>
        </section>

        {/* Upload area */}
        <section className={styles.uploadSection}>
          <h2 className={styles.sectionTitle}>Upload File</h2>
          <div className={styles.dropZone}>
            <div className={styles.dropInner}>
              <div className={styles.uploadIcon}>⬆</div>
              <p className={styles.dropTitle}>Drop your file here</p>
              <p className={styles.dropSubtitle}>
                or click to browse from your computer
              </p>
              <button type="button" className={styles.chooseButton}>
                Choose File
              </button>
              <p className={styles.dropHelper}>
                Supported formats: PDF, DOC, DOCX, PPT, PPTX, images, videos
                (Max 50MB)
              </p>
            </div>
          </div>
        </section>

        {/* Details form */}
        <form className={styles.detailsSection} onSubmit={handleSubmit}>
          <h2 className={styles.sectionTitle}>Material Details</h2>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              name="title"
              className={styles.input}
              placeholder="e.g., React Hooks Comprehensive Guide"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="subject">
                Subject *
              </label>
              <input
                id="subject"
                name="subject"
                className={styles.input}
                placeholder="e.g., Web Development"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="type">
                Material Type *
              </label>
              <select id="type" name="type" className={styles.input}>
                <option value="">Select type</option>
                <option>PDF</option>
                <option>Slides</option>
                <option>Notes</option>
                <option>Video</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="visibility">
                Visibility *
              </label>
              <select id="visibility" name="visibility" className={styles.input}>
                <option>Public</option>
                <option>Friends only</option>
                <option>Private</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Provide a brief description of the material..."
            />
            <p className={styles.helperText}>
              Help others understand what this material covers.
            </p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              className={styles.input}
              placeholder="Add a tag..."
            />
            <p className={styles.helperText}>
              Add relevant tags to help others find this material.
            </p>
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate("/app/library")}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Upload Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
