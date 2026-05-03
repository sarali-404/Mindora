import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UploadMaterialPage.module.css";
import materialService from "../services/materialService";
import authService from "../services/authService";
import { MdCloudUpload, MdInsertDriveFile, MdClose, MdCheckCircle, MdVerified } from "react-icons/md";

export default function UploadMaterialPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isVerified = authService.isFullyVerified();
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    materialType: "",
    visibility: "public",
    description: "",
    tags: "",
  });
  
  // File state
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    // Validate file size (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50MB limit");
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Supported: PDF, DOC, DOCX, PPT, PPTX, TXT, images, and videos.");
      return;
    }

    setFile(selectedFile);
    setError("");

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }

    // Auto-detect material type
    if (!formData.materialType) {
      let type = "Document";
      if (selectedFile.type === 'application/pdf') type = "PDF";
      else if (selectedFile.type.includes('presentation') || selectedFile.type.includes('powerpoint')) type = "Slides";
      else if (selectedFile.type.startsWith('video/')) type = "Video";
      else if (selectedFile.type.startsWith('image/')) type = "Image";
      setFormData(prev => ({ ...prev, materialType: type }));
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.startsWith('video/')) return '🎬';
    if (fileType === 'application/pdf') return '📕';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📊';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    return '📄';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!formData.materialType) {
      setError("Material type is required");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('title', formData.title.trim());
      uploadData.append('subject', formData.subject.trim());
      uploadData.append('materialType', formData.materialType);
      uploadData.append('visibility', formData.visibility);
      uploadData.append('description', formData.description.trim());
      uploadData.append('tags', formData.tags.trim());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await materialService.uploadMaterial(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);

      // Redirect to library after success
      setTimeout(() => {
        navigate('/app/library');
      }, 2000);

    } catch (err) {
      setError(err.message || "Failed to upload material. Please try again.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successContainer}>
          <MdCheckCircle className={styles.successIcon} />
          <h2>Upload Successful!</h2>
          <p>Your material has been uploaded and is now available in the library.</p>
          <button 
            className={styles.primaryButton}
            onClick={() => navigate('/app/library')}
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className={styles.page}>
        <div className={styles.verifyWall}>
          <MdVerified size={48} className={styles.verifyWallIcon} />
          <h2 className={styles.verifyWallTitle}>Verification Required</h2>
          <p className={styles.verifyWallText}>
            Only verified users can upload materials. Submit your ID on your profile to get verified.
          </p>
          <button className={styles.verifyWallBtn} onClick={() => navigate('/app/profile')}>
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate("/app/library")}>
      >
        ← Back to Library
      </button>

      <div className={styles.shell}>
        {/* Steps */}
        <section className={styles.steps}>
          <div className={`${styles.step} ${file ? styles.stepCompleted : styles.stepActive}`}>
            <div className={styles.stepCircle}>1</div>
            <div className={styles.stepLabel}>Upload your file</div>
          </div>

          <div className={styles.stepConnector} />

          <div className={`${styles.step} ${file && formData.title ? styles.stepActive : ''}`}>
            <div className={styles.stepCircle}>2</div>
            <div className={styles.stepLabel}>Fill the details and submit</div>
          </div>

          <div className={styles.stepConnector} />

          <div className={styles.step}>
            <div className={styles.stepCircle}>3</div>
            <div className={styles.stepLabel}>Get recognition and share</div>
          </div>
        </section>

        {/* Error display */}
        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {/* Upload area */}
        <section className={styles.uploadSection}>
          <h2 className={styles.sectionTitle}>Upload File</h2>
          
          {!file ? (
            <div 
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.dropInner}>
                <MdCloudUpload className={styles.uploadIcon} />
                <p className={styles.dropTitle}>Drop your file here</p>
                <p className={styles.dropSubtitle}>
                  or click to browse from your computer
                </p>
                <button 
                  type="button" 
                  className={styles.chooseButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose File
                </button>
                <p className={styles.dropHelper}>
                  Supported formats: PDF, DOC, DOCX, PPT, PPTX, images, videos (Max 50MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"
              />
            </div>
          ) : (
            <div className={styles.filePreview}>
              <div className={styles.filePreviewContent}>
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className={styles.previewImage} />
                ) : (
                  <div className={styles.fileIconLarge}>
                    {getFileIcon(file.type)}
                  </div>
                )}
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{file.name}</p>
                  <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
                </div>
                <button 
                  type="button" 
                  className={styles.removeFileBtn}
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <MdClose />
                </button>
              </div>
              
              {isUploading && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>{uploadProgress}%</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Details form */}
        <form className={styles.detailsSection} onSubmit={handleSubmit}>
          <h2 className={styles.sectionTitle}>Material Details</h2>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="title">
              Title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              name="title"
              className={styles.input}
              placeholder="e.g., React Hooks Comprehensive Guide"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isUploading}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="subject">
                Subject <span className={styles.required}>*</span>
              </label>
              <input
                id="subject"
                name="subject"
                className={styles.input}
                placeholder="e.g., Web Development"
                value={formData.subject}
                onChange={handleInputChange}
                disabled={isUploading}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="materialType">
                Material Type <span className={styles.required}>*</span>
              </label>
              <select 
                id="materialType" 
                name="materialType" 
                className={styles.input}
                value={formData.materialType}
                onChange={handleInputChange}
                disabled={isUploading}
              >
                <option value="">Select type</option>
                <option value="PDF">PDF</option>
                <option value="Slides">Slides</option>
                <option value="Notes">Notes</option>
                <option value="Video">Video</option>
                <option value="Image">Image</option>
                <option value="Document">Document</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="visibility">
                Visibility <span className={styles.required}>*</span>
              </label>
              <select 
                id="visibility" 
                name="visibility" 
                className={styles.input}
                value={formData.visibility}
                onChange={handleInputChange}
                disabled={isUploading}
              >
                <option value="public">Public</option>
                <option value="friends">Friends only</option>
                <option value="private">Private</option>
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
              value={formData.description}
              onChange={handleInputChange}
              disabled={isUploading}
              rows={4}
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
              placeholder="e.g., react, hooks, javascript (comma separated)"
              value={formData.tags}
              onChange={handleInputChange}
              disabled={isUploading}
            />
            <p className={styles.helperText}>
              Add relevant tags separated by commas to help others find this material.
            </p>
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate("/app/library")}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.primaryButton}
              disabled={isUploading || !file}
            >
              {isUploading ? 'Uploading...' : 'Upload Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
