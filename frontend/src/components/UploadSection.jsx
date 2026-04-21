import { useState, useRef } from 'react'
import './UploadSection.css'

export default function UploadSection({ onAnalyze, onReset, hasReport, isLoading, error }) {
  const [mode, setMode] = useState('ats_vs_jd')
  const [resumeFile, setResumeFile] = useState(null)
  const [jdFile, setJdFile] = useState(null)
  const [jdSource, setJdSource] = useState('file')   // 'file' | 'text'
  const [jdText, setJdText] = useState('')
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
    // In ATS-only mode, pass no JD at all. Otherwise pick the active source.
    const jdPayload = mode === 'ats_vs_jd'
      ? (jdSource === 'text'
          ? { text: jdText.trim() }
          : { file: jdFile })
      : null
    onAnalyze(
      resumeFile,
      jdPayload,
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

  const jdReady =
    mode === 'ats_only' ||
    (jdSource === 'file' ? !!jdFile : jdText.trim().length >= 30)
  const canAnalyze = !!resumeFile && jdReady && !isLoading

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

      {/* Mobile-only section label. Hidden on desktop via CSS. */}
      <div className="section-label section-label--mobile">Check type</div>

      {/* Top bar: mode toggle left, JD source tabs right (only in ats_vs_jd) */}
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

        {mode === 'ats_vs_jd' ? (
          <JdSourceTabs
            jdSource={jdSource}
            setJdSource={setJdSource}
            variant="desktop"
          />
        ) : (
          <span className="mode-hint">Check ATS readiness without a job description</span>
        )}
      </div>

      {/* Mobile-only section label above the Resume drop-zone */}
      <div className="section-label section-label--mobile">Your resume</div>

      {/* Upload inputs + button — inline for ats_only, grid for ats_vs_jd.
          Two parallel renderings inside: the desktop strip-style drop-zones
          and a mobile-only card-style variant with centered layout and
          inline action buttons. CSS hides whichever is off-screen. */}
      <div className={`upload-body upload-body--${mode}`}>

        {/* ── Desktop: strip drop-zone for resume ── */}
        <div className="desktop-only">
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
        </div>

        {/* ── Mobile: big centered drop-zone card for resume ── */}
        <div className="mobile-only">
          <MobileDropCard
            file={resumeFile}
            isDragOver={resumeDragOver}
            icon="📄"
            title="Drop your resume here"
            subtitle="PDF or DOCX"
            onDrop={handleDrop(setResumeFile, setResumeDragOver)}
            onDragOver={(e) => { e.preventDefault(); setResumeDragOver(true) }}
            onDragLeave={() => setResumeDragOver(false)}
            onClear={() => setResumeFile(null)}
          >
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange(setResumeFile)}
              style={{ display: 'none' }}
            />
            <button
              className="mobile-drop-btn mobile-drop-btn--primary"
              type="button"
              onClick={() => resumeInputRef.current?.click()}
            >
              Upload file
            </button>
          </MobileDropCard>
        </div>

        {/* ── Mobile-only section label above JD ── */}
        {mode === 'ats_vs_jd' && (
          <div className="section-label section-label--mobile">Your job description</div>
        )}

        {/* ── Desktop: JD source tabs (mobile JD tabs live inside the card below) ── */}

        {/* ── Desktop: strip drop-zone or textarea for JD ── */}
        {mode === 'ats_vs_jd' && (
          <div className="desktop-only">
            {jdSource === 'file' ? (
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
            ) : (
              <div className="jd-paste-wrap">
                <textarea
                  className="jd-paste-textarea"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here — from LinkedIn, Greenhouse, a careers page, etc."
                  aria-label="Paste job description text"
                  rows={1}
                />
                {jdText.length > 0 && (
                  <div className="jd-paste-meta">
                    <span>
                      {jdText.trim().length < 30
                        ? `${jdText.trim().length} / 30 chars`
                        : `${jdText.trim().length.toLocaleString()} chars`}
                    </span>
                    <button
                      type="button"
                      className="jd-paste-clear"
                      onClick={() => setJdText('')}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Mobile: big centered drop-zone card for JD with dual action buttons ── */}
        {mode === 'ats_vs_jd' && (
          <div className="mobile-only">
            <MobileDropCard
              file={jdSource === 'file' ? jdFile : null}
              isDragOver={jdDragOver}
              icon="📋"
              title={jdSource === 'file' ? 'Drop your JD here' : 'Paste the job description'}
              subtitle={jdSource === 'file' ? 'PDF or DOCX' : 'from LinkedIn, Greenhouse, careers page'}
              onDrop={handleDrop(setJdFile, setJdDragOver)}
              onDragOver={(e) => { e.preventDefault(); setJdDragOver(true) }}
              onDragLeave={() => setJdDragOver(false)}
              onClear={() => setJdFile(null)}
            >
              <input
                ref={jdInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange(setJdFile)}
                style={{ display: 'none' }}
              />
              <div className="mobile-drop-btn-row">
                <button
                  className={`mobile-drop-btn ${jdSource === 'file' ? 'mobile-drop-btn--primary' : 'mobile-drop-btn--secondary'}`}
                  type="button"
                  onClick={() => {
                    // Open the native file picker first (must happen inside the
                    // user gesture), then flip the source so the card re-renders.
                    jdInputRef.current?.click()
                    setJdSource('file')
                  }}
                >
                  📋 Upload file
                </button>
                <button
                  className={`mobile-drop-btn ${jdSource === 'text' ? 'mobile-drop-btn--primary' : 'mobile-drop-btn--secondary'}`}
                  type="button"
                  onClick={() => setJdSource('text')}
                >
                  ✏️ Paste text
                </button>
              </div>
            </MobileDropCard>

            {/* Paste textarea below the card when text source is active */}
            {jdSource === 'text' && (
              <div className="jd-paste-wrap jd-paste-wrap--mobile">
                <textarea
                  className="jd-paste-textarea"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here…"
                  aria-label="Paste job description text"
                  rows={6}
                />
                {jdText.length > 0 && (
                  <div className="jd-paste-meta">
                    <span>
                      {jdText.trim().length < 30
                        ? `${jdText.trim().length} / 30 chars`
                        : `${jdText.trim().length.toLocaleString()} chars`}
                    </span>
                    <button
                      type="button"
                      className="jd-paste-clear"
                      onClick={() => setJdText('')}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* Cover letter toggle, wrapped in an adv-field so it mirrors the
            "ATS SYSTEM" labelled dropdown (mobile only uses the label). */}
        {mode === 'ats_vs_jd' && (
          <div className="adv-field">
            <span className="adv-label adv-label--mobile">Add-ons</span>
            <button
              className={`adv-toggle ${showCoverLetter ? 'adv-toggle--active' : ''}`}
              type="button"
              onClick={() => setShowCoverLetter((s) => !s)}
            >
              📝 Cover Letter
            </button>
          </div>
        )}

        {/* Sample files shortcut — right-aligned, only while no files selected */}
        {!resumeFile && !jdFile && (
          <span className="sample-hint sample-hint--inline">
            No files yet?{' '}
            <button className="sample-link" onClick={handleTrySample} type="button">
              {mode === 'ats_vs_jd' ? 'Try sample resume & JD' : 'Try sample resume'}
            </button>
          </span>
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

      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}
    </section>
  )
}

/* ── Mobile-only drop-zone card: big centered icon + title + subtitle +
   one-or-two action buttons stacked inside the bordered card. ── */
function MobileDropCard({
  file, isDragOver, icon, title, subtitle,
  onDrop, onDragOver, onDragLeave, onClear, children,
}) {
  return (
    <div
      className={`mobile-drop ${isDragOver ? 'mobile-drop--drag' : ''} ${file ? 'mobile-drop--has' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {file ? (
        <>
          <span className="mobile-drop-check">✅</span>
          <span className="mobile-drop-filename" title={file.name}>{file.name}</span>
          {onClear && (
            <button className="mobile-drop-clear" type="button" onClick={onClear}>
              Remove
            </button>
          )}
        </>
      ) : (
        <>
          <span className="mobile-drop-icon">{icon}</span>
          <span className="mobile-drop-title">{title}</span>
          <span className="mobile-drop-subtitle">{subtitle}</span>
          {children}
        </>
      )}
    </div>
  )
}

/* ── JD source tabs — rendered in two places (desktop top-bar, mobile inline).
   CSS shows the right one at each breakpoint. ── */
function JdSourceTabs({ jdSource, setJdSource, variant }) {
  return (
    <div
      className={`jd-source-tabs jd-source-tabs--${variant}`}
      role="tablist"
      aria-label="Job description source"
    >
      {variant === 'desktop' && <span className="jd-source-label">JD:</span>}
      <button
        type="button"
        role="tab"
        aria-selected={jdSource === 'file'}
        className={`jd-source-tab ${jdSource === 'file' ? 'jd-source-tab--active' : ''}`}
        onClick={() => setJdSource('file')}
      >
        📋 Upload PDF
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={jdSource === 'text'}
        className={`jd-source-tab ${jdSource === 'text' ? 'jd-source-tab--active' : ''}`}
        onClick={() => setJdSource('text')}
      >
        ✏️ Paste Text
      </button>
    </div>
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
          <span className="dz-hint dz-hint--desktop">click or drag & drop</span>
          <span className="dz-hint dz-hint--mobile">Tap to upload</span>
        </>
      )}
    </div>
  )
}
