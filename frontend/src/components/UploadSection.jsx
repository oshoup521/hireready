import { useState, useRef } from 'react'
import './UploadSection.css'

export default function UploadSection({ onAnalyze, onReset, hasReport, isLoading, isWakingUp, error }) {
  const [mode, setMode] = useState('ats_vs_jd')
  const [resumeFile, setResumeFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)
  const [coverLetterFile, setCoverLetterFile] = useState(null)
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [atsPreset, setAtsPreset] = useState('')
  const [resumeDragOver, setResumeDragOver] = useState(false)
  const [jdDragOver, setJdDragOver] = useState(false)
  const [clDragOver, setClDragOver] = useState(false)

  const resumeInputRef = useRef(null)
  const jdInputRef = useRef(null)
  const clInputRef = useRef(null)

  function handleModeChange(newMode) {
    setMode(newMode)
    // Do NOT clear jdFile here — preserve it so switching back to ats_vs_jd
    // restores the previously selected JD without forcing a re-upload.
    // handleAnalyze already passes null for jd when mode === 'ats_only'.
  }

  function isValidFile(file) {
    return file && (
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    )
  }

  function handleFileChange(setter) {
    return (e) => {
      const file = e.target.files?.[0]
      if (isValidFile(file)) setter(file)
    }
  }

  function handleDrop(setter, setDrag) {
    return (e) => {
      e.preventDefault()
      setDrag(false)
      const file = e.dataTransfer.files?.[0]
      if (isValidFile(file)) setter(file)
    }
  }

  function handleAnalyze() {
    if (!resumeFile) return
    onAnalyze(
      resumeFile,
      mode === 'ats_vs_jd' ? jdFile : null,
      showCoverLetter ? coverLetterFile : null,
      atsPreset || null,
    )
  }

  // Load bundled sample files from /public and auto-fill the drop zones.
  // Respects the current mode: in ats_only, only the resume is loaded.
  async function handleTrySample() {
    try {
      if (mode === 'ats_vs_jd') {
        const [resumeRes, jdRes] = await Promise.all([
          fetch('/sample-resume.pdf'),
          fetch('/sample-jd.pdf'),
        ])
        const [resumeBlob, jdBlob] = await Promise.all([resumeRes.blob(), jdRes.blob()])
        setResumeFile(new File([resumeBlob], 'sample-resume.pdf', { type: 'application/pdf' }))
        setJdFile(new File([jdBlob], 'sample-jd.pdf', { type: 'application/pdf' }))
      } else {
        const resumeRes  = await fetch('/sample-resume.pdf')
        const resumeBlob = await resumeRes.blob()
        setResumeFile(new File([resumeBlob], 'sample-resume.pdf', { type: 'application/pdf' }))
      }
    } catch {
      // Silent fail — user can still upload manually
    }
  }

  function handleClearCoverLetter() {
    setCoverLetterFile(null)
    setShowCoverLetter(false)
  }

  const canAnalyze = !!resumeFile && (mode === 'ats_only' || !!jdFile) && !isLoading

  return (
    <section className="upload-section card">

      {/* Re-analyze strip — only visible after a report has been generated */}
      {hasReport && (
        <div className="reanalyze-bar">
          <span className="reanalyze-msg">✅ Analysis complete</span>
          <button className="btn-reanalyze" onClick={onReset} type="button">
            ↺ New Analysis
          </button>
        </div>
      )}

      {/* Top bar: mode toggle left, hint text right */}
      <div className="upload-header">
        <div className="mode-toggle" role="group">
          <button
            className={`mode-btn ${mode === 'ats_vs_jd' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeChange('ats_vs_jd')}
            type="button"
          >
            ATS vs JD
          </button>
          <button
            className={`mode-btn ${mode === 'ats_only' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeChange('ats_only')}
            type="button"
          >
            ATS Check Only
          </button>
        </div>
        <span className="mode-hint">
          {mode === 'ats_vs_jd'
            ? 'Compare your resume against a job description'
            : 'Check ATS readiness without a job description'}
        </span>
      </div>

      {/* Upload inputs + button — inline for ats_only, grid for ats_vs_jd */}
      <div className={`upload-body upload-body--${mode}`}>

        {/* Resume drop zone */}
        <DropZone
          inputRef={resumeInputRef}
          file={resumeFile}
          isDragOver={resumeDragOver}
          label="Resume (PDF or DOCX)"
          icon="📄"
          ariaLabel="Upload resume PDF or DOCX"
          onChange={handleFileChange(setResumeFile)}
          onDrop={handleDrop(setResumeFile, setResumeDragOver)}
          onDragOver={(e) => { e.preventDefault(); setResumeDragOver(true) }}
          onDragLeave={() => setResumeDragOver(false)}
          onClick={() => resumeInputRef.current?.click()}
        />

        {/* JD drop zone — only in ATS vs JD mode */}
        {mode === 'ats_vs_jd' && (
          <DropZone
            inputRef={jdInputRef}
            file={jdFile}
            isDragOver={jdDragOver}
            label="Job Description (PDF or DOCX)"
            icon="📋"
            ariaLabel="Upload job description PDF or DOCX"
            onChange={handleFileChange(setJdFile)}
            onDrop={handleDrop(setJdFile, setJdDragOver)}
            onDragOver={(e) => { e.preventDefault(); setJdDragOver(true) }}
            onDragLeave={() => setJdDragOver(false)}
            onClick={() => jdInputRef.current?.click()}
          />
        )}

        {/* Analyze button */}
        <button
          className="btn-primary upload-btn"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
        >
          {isLoading ? (
            <><span className="spinner" /> Analyzing…</>
          ) : (
            mode === 'ats_only' ? 'Check Score →' : 'Analyze →'
          )}
        </button>
      </div>

      {/* Advanced options row: ATS preset + cover letter toggle */}
      <div className="advanced-options">
        {/* ATS preset selector */}
        <div className="adv-field">
          <label className="adv-label" htmlFor="ats-select">ATS System</label>
          <select
            id="ats-select"
            className="adv-select"
            value={atsPreset}
            onChange={(e) => setAtsPreset(e.target.value)}
          >
            <option value="">Standard</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="workday">Workday</option>
            <option value="lever">Lever</option>
          </select>
        </div>

        {/* Cover letter toggle */}
        {mode === 'ats_vs_jd' && (
          <button
            className={`adv-toggle ${showCoverLetter ? 'adv-toggle--active' : ''}`}
            type="button"
            onClick={() => setShowCoverLetter((s) => !s)}
          >
            📝 Cover Letter
          </button>
        )}
      </div>

      {/* Cover letter drop zone */}
      {showCoverLetter && mode === 'ats_vs_jd' && (
        <div className="cover-letter-row">
          <DropZone
            inputRef={clInputRef}
            file={coverLetterFile}
            isDragOver={clDragOver}
            label="Cover Letter (PDF or DOCX)"
            icon="📝"
            ariaLabel="Upload cover letter PDF or DOCX"
            onChange={handleFileChange(setCoverLetterFile)}
            onDrop={handleDrop(setCoverLetterFile, setClDragOver)}
            onDragOver={(e) => { e.preventDefault(); setClDragOver(true) }}
            onDragLeave={() => setClDragOver(false)}
            onClick={() => clInputRef.current?.click()}
          />
          {coverLetterFile && (
            <button className="cl-clear-btn" type="button" onClick={handleClearCoverLetter} title="Remove cover letter">
              ×
            </button>
          )}
        </div>
      )}

      {/* Sample files shortcut — hide once files are selected */}
      {!resumeFile && !jdFile && (
        <div className="sample-hint">
          No files yet?{' '}
          <button className="sample-link" onClick={handleTrySample} type="button">
            {mode === 'ats_vs_jd' ? 'Try with sample resume & JD' : 'Try with sample resume'}
          </button>
        </div>
      )}

      {isWakingUp && (
        <div className="wakeup-banner">
          ⏳ Backend is waking up on Render, please wait…
        </div>
      )}
      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}
    </section>
  )
}

/* ── Reusable compact drop zone ── */
function DropZone({ inputRef, file, isDragOver, label, icon, ariaLabel,
                    onChange, onDrop, onDragOver, onDragLeave, onClick }) {
  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={ariaLabel}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
        style={{ display: 'none' }}
      />
      {file ? (
        <>
          <span className="dz-icon dz-icon--ok">✅</span>
          <span className="dz-filename" title={file.name}>{file.name}</span>
        </>
      ) : (
        <>
          <span className="dz-icon">{icon}</span>
          <span className="dz-label">{label}</span>
          <span className="dz-hint">click or drag & drop</span>
        </>
      )}
    </div>
  )
}
