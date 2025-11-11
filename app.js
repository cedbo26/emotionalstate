/**
 * Facilo Rapido - Emotional Barometer
 * Enhanced JavaScript Application
 * Features: Auto-save, Progress tracking, Validation, Dark mode, Summary
 */

// ================================
// Configuration & Constants
// ================================
const CONFIG = {
  AUTOSAVE_INTERVAL: 30000, // 30 seconds
  STORAGE_KEY: 'facilo_rapido_journal',
  THEME_KEY: 'facilo_rapido_theme',
  START_TIME_KEY: 'facilo_rapido_start_time',
  DEBOUNCE_DELAY: 500
};

// ================================
// Application State
// ================================
const AppState = {
  startTime: null,
  autoSaveTimer: null,
  formData: {},
  isDirty: false
};

// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  console.log('🚀 Initializing Facilo Rapido app...');

  // Set start time
  AppState.startTime = Date.now();
  localStorage.setItem(CONFIG.START_TIME_KEY, AppState.startTime);

  // Initialize features
  initializeTheme();
  initializeDateTimeFields();
  initializeConditionalFields();
  initializeAutoSave();
  initializeProgressTracking();
  initializeValidation();
  initializeSummaryModal();
  loadSavedData();

  console.log('✅ App initialized successfully');
}

// ================================
// Dark Mode
// ================================
function initializeTheme() {
  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  setTheme(savedTheme);

  // Create toggle button
  const toggleBtn = document.querySelector('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
    updateThemeIcon(savedTheme);
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.THEME_KEY, theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

function updateThemeIcon(theme) {
  const toggleBtn = document.querySelector('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    toggleBtn.setAttribute('aria-label',
      theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'
    );
  }
}

// ================================
// Date & Time Fields
// ================================
function initializeDateTimeFields() {
  // Set current date
  const dateField = document.querySelector('input[name="Date"]');
  if (dateField && !dateField.value) {
    dateField.value = new Date().toISOString().split('T')[0];
  }

  // Set current time
  const timeField = document.querySelector('input[name="Heure"]');
  if (timeField && !timeField.value) {
    const now = new Date();
    timeField.value = now.toTimeString().slice(0, 5);
  }

  // Update date display in header
  updateDateDisplay();
}

function updateDateDisplay() {
  const dateInfo = document.querySelector('.date-info');
  if (dateInfo) {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    dateInfo.textContent = `📅 ${now.toLocaleDateString('fr-FR', options)}`;
  }
}

// ================================
// Conditional Fields Logic
// ================================
function initializeConditionalFields() {
  // Listen for changes on radio buttons with data-toggle attribute
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type=radio][data-toggle]')) {
      applyConditions();
    }
  });

  // Apply initial conditions
  applyConditions();
}

function applyConditions() {
  document.querySelectorAll('.cond').forEach(block => {
    const rule = block.getAttribute('data-show-when');
    if (!rule) return;

    const [fieldName, wantedValue] = rule.split(':');
    const checkedInput = document.querySelector(`input[name="${fieldName}"]:checked`);
    const shouldShow = checkedInput && checkedInput.value === wantedValue;

    block.classList.toggle('hidden', !shouldShow);

    // Clear fields when hiding
    if (!shouldShow) {
      block.querySelectorAll('input, textarea, select').forEach(field => {
        if (field.type !== 'radio' && field.type !== 'checkbox') {
          field.value = '';
        } else if (field.type === 'radio' || field.type === 'checkbox') {
          field.checked = false;
        }
      });
    }
  });
}

// ================================
// Auto-Save to localStorage
// ================================
function initializeAutoSave() {
  const form = document.querySelector('form');
  if (!form) return;

  // Listen to all form changes
  form.addEventListener('input', debounce(() => {
    saveFormData();
    AppState.isDirty = true;
  }, CONFIG.DEBOUNCE_DELAY));

  form.addEventListener('change', () => {
    saveFormData();
    AppState.isDirty = true;
  });

  // Periodic auto-save
  AppState.autoSaveTimer = setInterval(() => {
    if (AppState.isDirty) {
      saveFormData();
      showSaveIndicator();
    }
  }, CONFIG.AUTOSAVE_INTERVAL);

  // Save before leaving
  window.addEventListener('beforeunload', (e) => {
    if (AppState.isDirty) {
      saveFormData();
    }
  });
}

function saveFormData() {
  const form = document.querySelector('form');
  if (!form) return;

  const formData = new FormData(form);
  const data = {
    timestamp: Date.now(),
    startTime: AppState.startTime,
    fields: {}
  };

  // Save all form fields
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('_')) continue; // Skip Formspree fields
    data.fields[key] = value;
  }

  // Save radio buttons
  form.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
    data.fields[radio.name] = radio.value;
  });

  // Save checkboxes
  const checkboxGroups = {};
  form.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
    if (!checkboxGroups[checkbox.name]) {
      checkboxGroups[checkbox.name] = [];
    }
    checkboxGroups[checkbox.name].push(checkbox.value);
  });
  Object.assign(data.fields, checkboxGroups);

  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  AppState.isDirty = false;

  console.log('💾 Form data saved to localStorage');
}

function loadSavedData() {
  const savedData = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);
    const form = document.querySelector('form');
    if (!form) return;

    // Restore start time
    if (data.startTime) {
      AppState.startTime = data.startTime;
    }

    // Restore form fields
    Object.entries(data.fields).forEach(([name, value]) => {
      const field = form.querySelector(`[name="${name}"]`);

      if (!field) return;

      if (field.type === 'radio') {
        const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else if (field.type === 'checkbox') {
        if (Array.isArray(value)) {
          value.forEach(v => {
            const checkbox = form.querySelector(`input[name="${name}"][value="${v}"]`);
            if (checkbox) checkbox.checked = true;
          });
        } else {
          const checkbox = form.querySelector(`input[name="${name}"][value="${value}"]`);
          if (checkbox) checkbox.checked = true;
        }
      } else {
        field.value = value;
      }
    });

    applyConditions();
    updateProgress();

    console.log('📂 Saved data loaded successfully');
    showNotification('Données précédentes restaurées', 'info');
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
}

function showSaveIndicator() {
  const indicator = document.querySelector('.save-indicator');
  if (!indicator) return;

  indicator.textContent = '✓ Sauvegardé';
  indicator.classList.add('visible');

  setTimeout(() => {
    indicator.classList.remove('visible');
  }, 2000);
}

// ================================
// Progress Tracking
// ================================
function initializeProgressTracking() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);

  updateProgress();
}

function updateProgress() {
  const form = document.querySelector('form');
  if (!form) return;

  // Get all visible required fields
  const allFields = Array.from(form.querySelectorAll('input, select, textarea'))
    .filter(field => {
      // Skip hidden fields and special fields
      if (field.name.startsWith('_')) return false;
      if (field.type === 'hidden') return false;

      // Check if field is in a hidden conditional block
      const parentCond = field.closest('.cond');
      if (parentCond && parentCond.classList.contains('hidden')) return false;

      return true;
    });

  // Count filled fields
  const filledFields = allFields.filter(field => {
    if (field.type === 'radio') {
      return form.querySelector(`input[name="${field.name}"]:checked`) !== null;
    } else if (field.type === 'checkbox') {
      return field.checked;
    } else {
      return field.value.trim() !== '';
    }
  });

  // Remove duplicates (radio buttons have multiple elements for same name)
  const uniqueFields = new Set();
  const uniqueFilled = new Set();

  allFields.forEach(field => {
    if (field.type === 'radio') {
      uniqueFields.add(field.name);
      if (form.querySelector(`input[name="${field.name}"]:checked`)) {
        uniqueFilled.add(field.name);
      }
    } else {
      uniqueFields.add(field.name);
      if ((field.type === 'checkbox' && field.checked) ||
          (field.type !== 'checkbox' && field.value.trim() !== '')) {
        uniqueFilled.add(field.name);
      }
    }
  });

  const total = uniqueFields.size;
  const filled = uniqueFilled.size;
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

  // Update progress bar
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent = `Progression : ${percentage}% (${filled}/${total} champs remplis)`;
  }
}

// ================================
// Form Validation
// ================================
function initializeValidation() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', handleFormSubmit);

  // Real-time validation for email
  const emailField = form.querySelector('input[type="email"]');
  if (emailField) {
    emailField.addEventListener('blur', () => validateEmail(emailField));
  }
}

function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  let isValid = true;

  // Clear previous errors
  form.querySelectorAll('.field-error').forEach(error => {
    error.classList.remove('visible');
  });
  form.querySelectorAll('.error').forEach(field => {
    field.classList.remove('error');
  });

  // Validate email
  const emailField = form.querySelector('input[type="email"]');
  if (emailField && !validateEmail(emailField)) {
    isValid = false;
  }

  // Check for at least one emotion/feeling input
  const hasEmotionalData = checkEmotionalDataPresence(form);
  if (!hasEmotionalData) {
    showNotification('Veuillez remplir au moins quelques données émotionnelles', 'warning');
    isValid = false;
  }

  if (isValid) {
    // Calculate session duration
    const duration = Math.round((Date.now() - AppState.startTime) / 1000 / 60); // in minutes
    const durationField = form.querySelector('input[name="Durée de remplissage (min)"]');
    if (durationField) {
      durationField.value = duration;
    }

    // Show summary modal
    showSummaryModal(form);
  } else {
    showNotification('Veuillez corriger les erreurs avant d\'envoyer', 'danger');
  }
}

function validateEmail(emailField) {
  const email = emailField.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    emailField.classList.add('error');
    const errorDiv = emailField.parentElement.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.textContent = 'Veuillez entrer une adresse email valide';
      errorDiv.classList.add('visible');
    }
    return false;
  }

  emailField.classList.remove('error');
  return true;
}

function checkEmotionalDataPresence(form) {
  // Check if at least some emotional scales are filled
  const emotionalFields = [
    'Énergie (1–5)',
    'Stabilité émotionnelle (1–5)',
    'Stress perçu (1–5)',
    'Sentiment dominant'
  ];

  let filledCount = 0;
  emotionalFields.forEach(fieldName => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      if (field.type === 'radio') {
        if (form.querySelector(`input[name="${fieldName}"]:checked`)) {
          filledCount++;
        }
      } else if (field.value.trim()) {
        filledCount++;
      }
    }
  });

  return filledCount >= 2; // At least 2 emotional fields filled
}

// ================================
// Summary Modal
// ================================
function initializeSummaryModal() {
  const modal = document.querySelector('#summary-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('#cancel-submit');
  const confirmBtn = modal.querySelector('#confirm-submit');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSummaryModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeSummaryModal);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmFormSubmit);
  }

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeSummaryModal();
    }
  });
}

function showSummaryModal(form) {
  const modal = document.querySelector('#summary-modal');
  if (!modal) {
    // If no modal, submit directly
    submitForm(form);
    return;
  }

  // Generate summary
  const summaryContent = generateSummary(form);
  const summaryContainer = modal.querySelector('#summary-content');
  if (summaryContainer) {
    summaryContainer.innerHTML = summaryContent;
  }

  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSummaryModal() {
  const modal = document.querySelector('#summary-modal');
  if (!modal) return;

  modal.classList.remove('visible');
  document.body.style.overflow = '';
}

function confirmFormSubmit() {
  closeSummaryModal();
  const form = document.querySelector('form');
  if (form) {
    submitForm(form);
  }
}

function submitForm(form) {
  // Clear localStorage after successful submit
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  localStorage.removeItem(CONFIG.START_TIME_KEY);

  // Submit the form
  form.submit();
}

function generateSummary(form) {
  const formData = new FormData(form);
  let html = '';

  const sections = {
    'État général': ['Énergie (1–5)', 'Stabilité émotionnelle (1–5)', 'Stress perçu (1–5)', 'Anxiété / Symptômes', 'Anxiété / Intensité'],
    'Sommeil': ['Heures de sommeil', 'Qualité du sommeil (1–10)', 'Réveils nocturnes', 'Difficulté endormissement'],
    'Santé physique': ['Symptômes physiques', 'Intensité symptômes (1–10)', 'Médicaments pris', 'Exercice physique'],
    'Relations': ['Javi contact', 'Nathan contact', 'Soutenue', 'Libre'],
    'Ressenti intérieur': ['Sentiment dominant', 'Culpabilité'],
    'État borderline': ['Poursuite affective', 'Peur abandon', 'Clivage', 'Impulsivité', 'Vide'],
    'Déclencheurs': ['Déclencheurs identifiés', 'Situation déclencheur'],
    'Stratégies d\'adaptation': ['Stratégies utilisées', 'Efficacité stratégies (1–10)'],
    'Pensées': ['Pensées automatiques', 'Distorsions cognitives'],
    'Notes': ['Notes', 'Verbalisation']
  };

  Object.entries(sections).forEach(([sectionName, fields]) => {
    const sectionData = [];

    fields.forEach(fieldName => {
      const value = getFieldValue(form, fieldName);
      if (value) {
        sectionData.push(`<div class="summary-item"><strong>${fieldName}:</strong> ${value}</div>`);
      }
    });

    if (sectionData.length > 0) {
      html += `
        <div class="summary-section">
          <h3>${sectionName}</h3>
          ${sectionData.join('')}
        </div>
      `;
    }
  });

  return html || '<p>Aucune donnée à afficher</p>';
}

function getFieldValue(form, fieldName) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (!field) return null;

  if (field.type === 'radio') {
    const checked = form.querySelector(`input[name="${fieldName}"]:checked`);
    return checked ? checked.value : null;
  } else if (field.type === 'checkbox') {
    const checked = Array.from(form.querySelectorAll(`input[name="${fieldName}"]:checked`));
    return checked.length > 0 ? checked.map(cb => cb.value).join(', ') : null;
  } else {
    return field.value.trim() || null;
  }
}

// ================================
// Notifications
// ================================
function showNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let notification = document.querySelector('.notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'save-indicator notification';
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.classList.add('visible', type);

  setTimeout(() => {
    notification.classList.remove('visible', type);
  }, 3000);
}

// ================================
// Utility Functions
// ================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ================================
// Clear Data Function
// ================================
function clearAllData() {
  if (confirm('Êtes-vous sûr de vouloir effacer toutes les données sauvegardées ?')) {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.START_TIME_KEY);
    location.reload();
  }
}

// Export for use in HTML
window.clearAllData = clearAllData;
