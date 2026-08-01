/* ---------------------------------------------------------------------------
 * App state
 * ------------------------------------------------------------------------ */
const state = {
  sessions: Storage.getAll(),
  query: '',
  modal: {
    open: false,
    step: 1,
    subject: null,
    chapter: '',
    explanation: '',
    photos: [], // [{ id, name, dataUrl }]
    saving: false,
  },
};

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry'];
const SUBJECT_CLASS = { Mathematics: 'math', Physics: 'physics', Chemistry: 'chemistry' };
const STEP_LABEL = { 1: 'Subject', 2: 'Chapter', 3: 'Evidence' };

/* ---------------------------------------------------------------------------
 * DOM refs
 * ------------------------------------------------------------------------ */
const el = {
  todayDate: document.getElementById('today-date'),
  streakNum: document.getElementById('streak-num'),
  totalNum: document.getElementById('total-num'),
  addBtn: document.getElementById('add-btn'),
  searchInput: document.getElementById('search-input'),
  timeline: document.getElementById('timeline'),
  emptyState: document.getElementById('empty-state'),

  modalBackdrop: document.getElementById('modal-backdrop'),
  modal: document.getElementById('modal'),
  modalStepLabel: document.getElementById('modal-step-label'),
  modalClose: document.getElementById('modal-close'),
  modalBody: document.getElementById('modal-body'),
  modalFooter: document.getElementById('modal-footer'),
};

/* ---------------------------------------------------------------------------
 * Dashboard rendering
 * ------------------------------------------------------------------------ */
function renderDashboard() {
  el.todayDate.textContent = DateUtils.formatLongDate(DateUtils.todayKey());
  const { currentStreak, totalDays } = Streak.compute(state.sessions);
  el.streakNum.textContent = currentStreak;
  el.totalNum.textContent = totalDays;
}

/* ---------------------------------------------------------------------------
 * Timeline rendering
 * ------------------------------------------------------------------------ */
function getFilteredSessions() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.sessions;
  return state.sessions.filter(
    (s) => s.chapter.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q)
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  // textContent->innerHTML escapes &, <, > but not quotes, which matters
  // since some of these values get embedded inside HTML attributes below.
  return div.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function sessionCardHtml(session) {
  const photosHtml = (session.photos || [])
    .map((p) => `<img src="${p.dataUrl}" alt="Evidence for ${escapeHtml(session.chapter)}" />`)
    .join('');

  return `
    <article class="session-card">
      <div class="session-card-top">
        <div class="subject-tag">
          <span class="dot ${SUBJECT_CLASS[session.subject]}"></span>
          <span class="subject-name">${escapeHtml(session.subject)}</span>
        </div>
        <time class="session-date">${DateUtils.formatShortDate(session.date)}</time>
      </div>
      <h3 class="session-chapter">${escapeHtml(session.chapter)}</h3>
      ${session.explanation ? `<p class="session-explanation">${escapeHtml(session.explanation)}</p>` : ''}
      ${photosHtml ? `<div class="session-photos">${photosHtml}</div>` : ''}
    </article>
  `;
}

function renderTimeline() {
  const filtered = getFilteredSessions();

  if (filtered.length === 0) {
    el.timeline.innerHTML = '';
    el.emptyState.hidden = false;
    el.emptyState.textContent = state.query.trim()
      ? 'No sessions match that search.'
      : "No sessions yet. Log today's proof to start your streak.";
    return;
  }

  el.emptyState.hidden = true;
  el.timeline.innerHTML = filtered.map(sessionCardHtml).join('');
}

/* ---------------------------------------------------------------------------
 * Modal rendering
 * ------------------------------------------------------------------------ */
function openModal() {
  state.modal = {
    open: true,
    step: 1,
    subject: null,
    chapter: '',
    explanation: '',
    photos: [],
    saving: false,
  };
  el.modalBackdrop.hidden = false;
  el.modal.hidden = false;
  renderModal();
}

function closeModal() {
  state.modal.open = false;
  el.modalBackdrop.hidden = true;
  el.modal.hidden = true;
}

function canProceedFromChapter() {
  return state.modal.chapter.trim().length > 0;
}

function canSave() {
  const m = state.modal;
  const isChemistry = m.subject === 'Chemistry';
  return m.photos.length > 0 && (!isChemistry || m.explanation.trim().length > 0);
}

function renderModal() {
  const m = state.modal;
  el.modalStepLabel.textContent = `Step ${m.step} of 3 · ${STEP_LABEL[m.step]}`;

  el.modalBody.innerHTML = bodyHtmlForStep(m);
  el.modalFooter.innerHTML = footerHtmlForStep(m);

  // Re-hydrate the inputs' focus/value after innerHTML replace where needed
  if (m.step === 2) {
    const input = document.getElementById('chapter-input');
    if (input) input.focus();
  }
}

function bodyHtmlForStep(m) {
  if (m.step === 1) {
    return SUBJECTS.map(
      (s) => `
      <button type="button" class="subject-option ${m.subject === s ? 'selected' : ''}" data-subject="${s}">
        <span class="dot ${SUBJECT_CLASS[s]}"></span>
        <span>${s}</span>
      </button>
    `
    ).join('');
  }

  if (m.step === 2) {
    return `
      <label class="field-label" for="chapter-input">Chapter or topic</label>
      <input
        id="chapter-input"
        type="text"
        class="text-input"
        placeholder="e.g. Straight Lines"
        value="${escapeHtml(m.chapter)}"
      />
      <p class="helper-text">Logging for <strong>${escapeHtml(m.subject)}</strong></p>
    `;
  }

  // step 3
  const isChemistry = m.subject === 'Chemistry';
  const photoLabel = isChemistry
    ? 'Photos of your handwritten notes'
    : 'Photos of solved problems';

  const thumbs = m.photos
    .map(
      (p) => `
      <div class="photo-thumb">
        <img src="${p.dataUrl}" alt="${escapeHtml(p.name)}" />
        <button type="button" class="photo-remove" data-remove-photo="${p.id}" aria-label="Remove photo">✕</button>
      </div>
    `
    )
    .join('');

  return `
    <label class="field-label">${photoLabel}</label>
    <div class="photo-grid">
      ${thumbs}
      <label class="photo-add">
        <span class="plus">+</span>
        <span class="label">Add photo</span>
        <input id="photo-input" type="file" accept="image/*" multiple capture="environment" />
      </label>
    </div>
    ${
      isChemistry
        ? `
      <div style="margin-top: 1.25rem;">
        <label class="field-label" for="explanation-input">Explain what you understood today</label>
        <textarea id="explanation-input" class="textarea-input" rows="4" placeholder="In your own words...">${escapeHtml(m.explanation)}</textarea>
      </div>
    `
        : ''
    }
  `;
}

function footerHtmlForStep(m) {
  const backBtn = m.step > 1 ? `<button type="button" class="btn-secondary" id="btn-back">Back</button>` : '';

  if (m.step === 1) return backBtn;

  if (m.step === 2) {
    return `${backBtn}<button type="button" class="btn-continue" id="btn-continue" ${
      canProceedFromChapter() ? '' : 'disabled'
    }>Continue</button>`;
  }

  // step 3
  return `${backBtn}<button type="button" class="btn-continue" id="btn-save" ${
    canSave() && !m.saving ? '' : 'disabled'
  }>${m.saving ? 'Saving…' : 'Save session'}</button>`;
}

/* ---------------------------------------------------------------------------
 * Modal event delegation
 * (body/footer are replaced via innerHTML, so we listen on their parents)
 * ------------------------------------------------------------------------ */
el.modalBody.addEventListener('click', (e) => {
  const subjectBtn = e.target.closest('[data-subject]');
  if (subjectBtn) {
    state.modal.subject = subjectBtn.dataset.subject;
    state.modal.step = 2;
    renderModal();
    return;
  }

  const removeBtn = e.target.closest('[data-remove-photo]');
  if (removeBtn) {
    const id = removeBtn.dataset.removePhoto;
    state.modal.photos = state.modal.photos.filter((p) => p.id !== id);
    renderModal();
  }
});

el.modalBody.addEventListener('input', (e) => {
  if (e.target.id === 'chapter-input') {
    state.modal.chapter = e.target.value;
    // Only the continue button's disabled state needs updating, not a full
    // re-render (which would steal focus from the input).
    const continueBtn = document.getElementById('btn-continue');
    if (continueBtn) continueBtn.disabled = !canProceedFromChapter();
  }
  if (e.target.id === 'explanation-input') {
    state.modal.explanation = e.target.value;
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) saveBtn.disabled = !canSave();
  }
});

el.modalBody.addEventListener('change', async (e) => {
  if (e.target.id === 'photo-input' && e.target.files.length) {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    const converted = await Promise.all(
      files.map(async (file) => ({
        id: Storage.uuid(),
        name: file.name,
        dataUrl: await Storage.fileToDataUrl(file),
      }))
    );
    state.modal.photos = [...state.modal.photos, ...converted];
    renderModal();
  }
});

el.modalFooter.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-back') {
    state.modal.step -= 1;
    renderModal();
    return;
  }

  if (e.target.id === 'btn-continue') {
    if (!canProceedFromChapter()) return;
    state.modal.step = 3;
    renderModal();
    return;
  }

  if (e.target.id === 'btn-save') {
    if (!canSave() || state.modal.saving) return;
    state.modal.saving = true;
    renderModal();

    const m = state.modal;
    const isChemistry = m.subject === 'Chemistry';
    const session = {
      id: Storage.uuid(),
      date: DateUtils.todayKey(),
      createdAt: new Date().toISOString(),
      subject: m.subject,
      chapter: m.chapter.trim(),
      explanation: isChemistry ? m.explanation.trim() : null,
      photos: m.photos,
    };

    try {
      Storage.add(session);
      state.sessions = Storage.getAll();
      renderDashboard();
      renderTimeline();
      closeModal();
    } catch (err) {
      alert(err.message || 'Could not save this session. Please try again.');
      state.modal.saving = false;
      renderModal();
    }
  }
});

/* ---------------------------------------------------------------------------
 * Top-level event wiring
 * ------------------------------------------------------------------------ */
el.addBtn.addEventListener('click', openModal);
el.modalClose.addEventListener('click', closeModal);
el.modalBackdrop.addEventListener('click', closeModal);

el.searchInput.addEventListener('input', (e) => {
  state.query = e.target.value;
  renderTimeline();
});

/* ---------------------------------------------------------------------------
 * Initial render
 * ------------------------------------------------------------------------ */
renderDashboard();
renderTimeline();

/* ---------------------------------------------------------------------------
 * PWA service worker registration
 * ------------------------------------------------------------------------ */
// Service workers require a secure context (https, or http://localhost).
// They will not register when the file is opened directly as file:// -
// that's a browser restriction, not a bug in this app. Serve the folder
// over http(s) (see README) to get offline support + "Add to Home Screen".
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
