document.addEventListener('DOMContentLoaded', () => {
  const promptForm = document.getElementById('prompt-form');
  const promptIdInput = document.getElementById('prompt-id');
  const promptTitleInput = document.getElementById('prompt-title-input');
  const promptContentInput = document.getElementById('prompt-content-input');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const promptsContainer = document.getElementById('prompts-container');

  // Routines elements
  const formRoutinesList = document.getElementById('form-routines-list');
  const routineTriggerTypeSelect = document.getElementById('routine-trigger-type');
  const scheduledTriggerInputs = document.getElementById('scheduled-trigger-inputs');
  const githubTriggerInputs = document.getElementById('github-trigger-inputs');
  const routineTimeInput = document.getElementById('routine-time');
  const githubUrlInput = document.getElementById('github-url-input');
  const githubFrequencySelect = document.getElementById('github-frequency-select');
  const addRoutineBtn = document.getElementById('add-routine-btn');
  const cancelRoutineBtn = document.getElementById('cancel-routine-btn');
  const dayButtons = document.querySelectorAll('.day-btn');

  let prompts = [];
  let currentRoutines = [];
  let editingRoutineIndex = -1;

  // Default initial prompts if storage is empty, with a sample routine
  const defaultPrompts = [
    {
      id: 'default-1',
      title: 'TL;DR Summarizer',
      content: 'Summarize the following text in 3 concise bullet points:\n\n{{input}}',
      routines: [
        {
          id: 'default-routine-1',
          type: 'scheduled',
          time: '09:00',
          days: [1, 2, 3, 4, 5] // Monday - Friday
        }
      ]
    },
    {
      id: 'default-2',
      title: 'Translate to Spanish',
      content: 'Translate the following text to Spanish, maintaining a polite tone:\n\n{{input}}',
      routines: []
    },
    {
      id: 'default-3',
      title: 'GitHub Commit Summarizer',
      content: 'Here are the latest commits from the repository. Write a concise summary of the changes to give a user an idea of what updates were made to the codebase:\n\n{{input}}',
      routines: [
        {
          id: 'default-routine-2',
          type: 'github',
          githubUrl: 'https://github.com/michaelwasserman/ai-examples',
          githubFrequency: 'daily'
        }
      ]
    }
  ];

  // Day buttons toggle behavior
  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });

  // Load prompts from chrome.storage.local
  function loadPrompts() {
    chrome.storage.local.get(['prompts'], (result) => {
      if (result.prompts) {
        prompts = result.prompts;
      } else {
        prompts = defaultPrompts;
        savePromptsToStorage();
      }
      renderPrompts();
    });
  }

  // Save prompts to chrome.storage.local
  function savePromptsToStorage() {
    chrome.storage.local.set({ prompts }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving to storage:', chrome.runtime.lastError);
      }
    });
  }

  // Formatter for days list to human readable format
  function formatDays(days) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayShorts = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    if (!days || days.length === 0) return 'Never';
    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';

    return days.map(d => dayNames[d]).join(', ');
  }

  function parseGithubUrl(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'github.com') return null;
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
    } catch (e) {}
    return null;
  }

  // Formatter for routine item
  function formatRoutine(routine) {
    if (routine.type === 'scheduled') {
      return `${formatDays(routine.days)} at ${routine.time}`;
    }
    if (routine.type === 'github') {
      const parsed = parseGithubUrl(routine.githubUrl);
      const repoLabel = parsed ? `${parsed.owner}/${parsed.repo}` : routine.githubUrl;
      const freqLabel = routine.githubFrequency === 'high' ? '1m' : 'daily';
      return `GitHub: ${repoLabel} (${freqLabel})`;
    }
    return routine.type;
  }

  // Render the list of prompts in the popup
  function renderPrompts() {
    promptsContainer.innerHTML = '';

    if (prompts.length === 0) {
      promptsContainer.innerHTML = '<div class="empty-state">No prompts found. Add one above!</div>';
      return;
    }

    prompts.forEach((prompt) => {
      const card = document.createElement('div');
      card.className = 'prompt-card';
      card.dataset.id = prompt.id;

      const titleEl = document.createElement('div');
      titleEl.className = 'prompt-title';
      titleEl.textContent = prompt.title;

      const textEl = document.createElement('div');
      textEl.className = 'prompt-text';
      textEl.textContent = prompt.content;

      // Card actions (Edit/Delete)
      const actionsEl = document.createElement('div');
      actionsEl.className = 'card-actions';

      // Edit Button
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn edit';
      editBtn.title = 'Edit Prompt';
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      `;
      editBtn.addEventListener('click', () => editPrompt(prompt));

      // Delete Button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete';
      deleteBtn.title = 'Delete Prompt';
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deletePrompt(prompt.id));

      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(deleteBtn);

      card.appendChild(titleEl);
      card.appendChild(textEl);

      // Render prompt routines if any
      const routines = prompt.routines || [];
      if (routines.length > 0) {
        const routinesEl = document.createElement('div');
        routinesEl.className = 'card-routines';

        routines.forEach(routine => {
          const item = document.createElement('div');
          item.className = 'card-routine-item';
          item.innerHTML = `
            <svg viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span>${formatRoutine(routine)}</span>
          `;
          routinesEl.appendChild(item);
        });
        card.appendChild(routinesEl);
      }

      card.appendChild(actionsEl);
      promptsContainer.appendChild(card);
    });
  }

  // Render routines list in the editing form
  function renderFormRoutines() {
    formRoutinesList.innerHTML = '';

    if (currentRoutines.length === 0) {
      formRoutinesList.style.display = 'none';
      return;
    }

    formRoutinesList.style.display = 'flex';
    currentRoutines.forEach((routine, idx) => {
      const item = document.createElement('div');
      item.className = 'form-routine-item';

      const info = document.createElement('div');
      info.className = 'form-routine-item-info';
      if (routine.type === 'scheduled') {
        info.innerHTML = `
          <strong>${routine.time}</strong>
          <span class="form-routine-item-days">(${formatDays(routine.days)})</span>
        `;
      } else if (routine.type === 'github') {
        const parsed = parseGithubUrl(routine.githubUrl);
        const repoLabel = parsed ? `${parsed.owner}/${parsed.repo}` : 'GitHub Repo';
        info.innerHTML = `
          <strong>GitHub: ${repoLabel}</strong>
          <span class="form-routine-item-days">(${routine.githubFrequency})</span>
        `;
      } else {
        info.innerHTML = `<strong>${routine.type}</strong>`;
      }

      const actions = document.createElement('div');
      actions.className = 'form-routine-actions';

      // Edit routine action
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'form-routine-action-btn edit';
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      `;
      editBtn.addEventListener('click', () => editRoutine(idx));

      // Delete routine action
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'form-routine-action-btn delete';
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deleteRoutine(idx));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);

      formRoutinesList.appendChild(item);
    });
  }

  // Add or Save a routine inside the form
  addRoutineBtn.addEventListener('click', () => {
    const type = routineTriggerTypeSelect.value;
    let newRoutine = {};

    if (type === 'scheduled') {
      const time = routineTimeInput.value;
      if (!time) return;

      const activeDays = [];
      dayButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
          activeDays.push(parseInt(btn.dataset.day, 10));
        }
      });

      if (activeDays.length === 0) {
        alert('Please select at least one day.');
        return;
      }

      newRoutine = {
        type: 'scheduled',
        time,
        days: activeDays.sort((a, b) => a - b)
      };
    } else if (type === 'github') {
      const githubUrl = githubUrlInput.value.trim();
      if (!githubUrl) {
        alert('Please enter a GitHub repository URL.');
        return;
      }

      if (!parseGithubUrl(githubUrl)) {
        alert('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).');
        return;
      }

      newRoutine = {
        type: 'github',
        githubUrl,
        githubFrequency: githubFrequencySelect.value
      };
    }

    if (editingRoutineIndex > -1) {
      // Update existing
      currentRoutines[editingRoutineIndex] = {
        ...currentRoutines[editingRoutineIndex],
        ...newRoutine
      };
    } else {
      // Add new
      newRoutine.id = 'routine-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      currentRoutines.push(newRoutine);
    }

    resetRoutineInputs();
    renderFormRoutines();
  });

  // Toggle routine triggers fields
  routineTriggerTypeSelect.addEventListener('change', () => {
    const type = routineTriggerTypeSelect.value;
    if (type === 'scheduled') {
      scheduledTriggerInputs.style.display = 'flex';
      githubTriggerInputs.style.display = 'none';
    } else if (type === 'github') {
      scheduledTriggerInputs.style.display = 'none';
      githubTriggerInputs.style.display = 'flex';
    }
  });

  // Edit a routine within the form
  function editRoutine(index) {
    editingRoutineIndex = index;
    const routine = currentRoutines[index];

    routineTriggerTypeSelect.value = routine.type || 'scheduled';
    if (routine.type === 'github') {
      scheduledTriggerInputs.style.display = 'none';
      githubTriggerInputs.style.display = 'flex';
      githubUrlInput.value = routine.githubUrl || '';
      githubFrequencySelect.value = routine.githubFrequency || 'daily';
    } else {
      scheduledTriggerInputs.style.display = 'flex';
      githubTriggerInputs.style.display = 'none';
      routineTimeInput.value = routine.time || '09:00';

      // Reset and select day buttons
      dayButtons.forEach(btn => {
        const dayVal = parseInt(btn.dataset.day, 10);
        if (routine.days && routine.days.includes(dayVal)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    addRoutineBtn.textContent = 'Save Routine';
    cancelRoutineBtn.style.display = 'inline-block';
  }

  // Delete a routine within the form
  function deleteRoutine(index) {
    currentRoutines.splice(index, 1);
    if (editingRoutineIndex === index) {
      resetRoutineInputs();
    } else if (editingRoutineIndex > index) {
      editingRoutineIndex--;
    }
    renderFormRoutines();
  }

  // Cancel routine edit
  cancelRoutineBtn.addEventListener('click', resetRoutineInputs);

  function resetRoutineInputs() {
    editingRoutineIndex = -1;
    routineTriggerTypeSelect.value = 'scheduled';
    scheduledTriggerInputs.style.display = 'flex';
    githubTriggerInputs.style.display = 'none';
    
    // Reset scheduled fields
    routineTimeInput.value = '09:00';
    dayButtons.forEach(btn => btn.classList.remove('active'));

    // Reset github fields
    githubUrlInput.value = '';
    githubFrequencySelect.value = 'daily';

    addRoutineBtn.textContent = 'Add Routine';
    cancelRoutineBtn.style.display = 'none';
  }

  // Handle main prompt creation/update form submit
  promptForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = promptIdInput.value;
    const title = promptTitleInput.value.trim();
    const content = promptContentInput.value.trim();

    if (!title || !content) return;

    if (id) {
      // Update existing prompt
      prompts = prompts.map(p => p.id === id ? { ...p, title, content, routines: currentRoutines } : p);
    } else {
      // Add new prompt
      const newPrompt = {
        id: 'prompt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title,
        content,
        routines: currentRoutines
      };
      prompts.push(newPrompt);
    }

    savePromptsToStorage();
    renderPrompts();
    resetForm();
  });

  // Enter edit mode for a prompt
  function editPrompt(prompt) {
    promptIdInput.value = prompt.id;
    promptTitleInput.value = prompt.title;
    promptContentInput.value = prompt.content;
    
    // Load routines
    currentRoutines = JSON.parse(JSON.stringify(prompt.routines || []));
    renderFormRoutines();
    resetRoutineInputs();

    submitBtn.textContent = 'Save Prompt';
    cancelBtn.style.display = 'inline-block';
    promptTitleInput.focus();
  }

  // Delete a prompt
  function deletePrompt(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      prompts = prompts.filter(p => p.id !== id);
      savePromptsToStorage();
      renderPrompts();

      if (promptIdInput.value === id) {
        resetForm();
      }
    }
  }

  // Cancel edit mode and reset the form
  cancelBtn.addEventListener('click', resetForm);

  function resetForm() {
    promptForm.reset();
    promptIdInput.value = '';
    currentRoutines = [];
    editingRoutineIndex = -1;
    resetRoutineInputs();
    renderFormRoutines();
    submitBtn.textContent = 'Add Prompt';
    cancelBtn.style.display = 'none';
  }

  // History Elements
  const historyHeader = document.getElementById('history-header');
  const historyContent = document.getElementById('history-content');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Load and render history logs
  function loadHistory() {
    chrome.storage.local.get(['logs'], (result) => {
      renderHistory(result.logs || []);
    });
  }

  // Render the history list
  function renderHistory(logs) {
    historyList.innerHTML = '';

    if (logs.length === 0) {
      historyList.innerHTML = '<div class="empty-state">No execution logs found.</div>';
      return;
    }

    logs.forEach((log) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.dataset.id = log.id;

      const duration = ((new Date(log.endTimestamp) - new Date(log.startTimestamp)) / 1000).toFixed(1);
      const startTime = new Date(log.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const startDate = new Date(log.startTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

      const header = document.createElement('div');
      header.className = 'history-card-header';
      header.innerHTML = `
        <span class="history-card-title">${escapeHtml(log.promptTitle)}</span>
        <div class="history-card-meta">
          <span class="history-card-time">${startDate} ${startTime}</span>
          <span class="status-badge ${log.status}">${log.status}</span>
        </div>
      `;

      const details = document.createElement('div');
      details.className = 'history-card-details';
      details.style.display = 'none';
      details.innerHTML = `
        <div class="history-detail-group">
          <span class="history-detail-label">Prompt Input</span>
          <div class="history-detail-val">${escapeHtml(log.input)}</div>
        </div>
        <div class="history-detail-group">
          <span class="history-detail-label">AI Output</span>
          <div class="history-detail-val">${escapeHtml(log.output)}</div>
        </div>
        <div class="history-detail-duration">Duration: ${duration}s</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.history-detail-val')) return;
        const isCollapsed = details.style.display === 'none';
        details.style.display = isCollapsed ? 'flex' : 'none';
      });

      card.appendChild(header);
      card.appendChild(details);
      historyList.appendChild(card);
    });

    checkAndHighlightLog();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toggle history visibility
  historyHeader.addEventListener('click', () => {
    const isOpen = historyHeader.classList.toggle('open');
    historyContent.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      loadHistory();
    }
  });

  // Clear history action
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all execution logs?')) {
      chrome.storage.local.set({ logs: [] }, () => {
        renderHistory([]);
      });
    }
  });

  // Highlight a specific log entry if referenced in storage (e.g. from notification click)
  function checkAndHighlightLog() {
    chrome.storage.local.get(['selectedLogId'], (result) => {
      const logId = result.selectedLogId;
      if (!logId) return;

      // 1. Ensure history accordion is expanded
      if (!historyHeader.classList.contains('open')) {
        historyHeader.classList.add('open');
        historyContent.style.display = 'block';
        loadHistory();
      }

      // 2. Search rendered cards and apply transitions
      const card = document.querySelector(`.history-card[data-id="${logId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const details = card.querySelector('.history-card-details');
        if (details) {
          details.style.display = 'flex';
        }

        card.classList.add('highlight');
        setTimeout(() => {
          card.classList.remove('highlight');
        }, 3000);

        chrome.storage.local.remove('selectedLogId');
      }
    });
  }

  // Real-time listener for storage updates to keep UI synchronized
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.prompts) {
        prompts = changes.prompts.newValue || [];
        renderPrompts();
      }
      if (changes.logs && historyHeader.classList.contains('open')) {
        renderHistory(changes.logs.newValue || []);
      }
      if (changes.selectedLogId && changes.selectedLogId.newValue) {
        checkAndHighlightLog();
      }
    }
  });

  // Initial load
  loadPrompts();
  checkAndHighlightLog();
});
