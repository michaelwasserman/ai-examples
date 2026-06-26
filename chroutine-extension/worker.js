// Chroutine Extension Background Service Worker

const NOTIFICATION_ICON = 'icon.png';

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

// Calculate the next timestamp for a scheduled time and selected days of week
function getNextTriggerTime(timeStr, days) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hours, minutes, 0, 0);

    const candidateDay = candidate.getDay(); // 0 = Sunday, 1 = Monday...

    if (days.includes(candidateDay)) {
      if (candidate > now) {
        return candidate.getTime();
      }
    }
  }
  return Date.now() + 60000;
}

// Synchronize all alarms to match stored prompts' routines
async function syncAlarms(prompts) {
  const activeAlarms = await chrome.alarms.getAll();

  for (const alarm of activeAlarms) {
    if (alarm.name.includes('|')) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  const storage = await new Promise(r => chrome.storage.local.get(['lastPolledTimes'], r));
  const lastPolledTimes = storage.lastPolledTimes || {};
  let lastPolledChanged = false;

  for (const prompt of prompts) {
    const routines = prompt.routines || [];
    for (const routine of routines) {
      const alarmName = `${prompt.id}|${routine.id}`;

      if (routine.type === 'scheduled') {
        const nextTime = getNextTriggerTime(routine.time, routine.days);
        chrome.alarms.create(alarmName, { when: nextTime });
      } else if (routine.type === 'github') {
        const entry = lastPolledTimes[routine.id];
        if (!entry || entry.url !== routine.githubUrl) {
          executeGithubRoutine(prompt, routine);
          lastPolledTimes[routine.id] = {
            time: new Date().toISOString(),
            url: routine.githubUrl
          };
          lastPolledChanged = true;
        }

        const periodInMinutes = routine.githubFrequency === 'high' ? 1 : 1440;
        chrome.alarms.create(alarmName, {
          delayInMinutes: periodInMinutes,
          periodInMinutes: periodInMinutes
        });
      }
    }
  }

  if (lastPolledChanged) {
    await new Promise(r => chrome.storage.local.set({ lastPolledTimes }, r));
  }
}

// Resilient helper to locate the Prompt API interface
async function getLanguageModel() {
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt/Language Model API is not supported or enabled in this browser.');
  }
  return self.LanguageModel;
}

// Store prompt execution log entry
async function addLogEntry(promptId, promptTitle, startTimestamp, endTimestamp, status, input, output) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['logs'], (result) => {
      const logs = result.logs || [];
      const newEntry = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        promptId,
        promptTitle,
        startTimestamp,
        endTimestamp,
        status,
        input,
        output
      };

      logs.unshift(newEntry);

      if (logs.length > 100) {
        logs.pop();
      }

      chrome.storage.local.set({ logs }, () => {
        resolve(newEntry.id);
      });
    });
  });
}

// Wrapper to handle notification permissions and log failures
function showNotification(notificationId, options) {
  chrome.notifications.getPermissionLevel((level) => {
    if (level !== 'granted') {
      console.error(`Notification permission is not granted (current level: ${level}). Cannot display:`, options.title);
      return;
    }

    chrome.notifications.create(notificationId, options)
      .then((id) => {
        console.log(`Successfully created notification: ${id}`);
      })
      .catch((error) => {
        console.error('Failed to create notification', error);
      });
  });
}

// Run LanguageModel prompt inference and log / notify the user
async function runLanguageModelForPrompt(prompt, routine, input, startTimestamp) {
  let finalPromptText = prompt.content;
  if (finalPromptText.includes('{{input}}')) {
    finalPromptText = finalPromptText.replace('{{input}}', input);
  }

  try {
    const lm = await getLanguageModel();
    const availability = await lm.availability();
    if (availability === 'unavailable') {
      throw new Error('AI Language Model is not available.');
    }

    const session = await lm.create();
    const response = await session.prompt(finalPromptText);
    session.destroy(); // Clean up session resources

    const endTimestamp = new Date().toISOString();

    // Log success entry
    const logId = await addLogEntry(prompt.id, prompt.title, startTimestamp, endTimestamp, 'success', finalPromptText, response);

    // Notify user with execution result
    const notificationId = `success|${logId}`;
    showNotification(notificationId, {
      type: 'basic',
      iconUrl: NOTIFICATION_ICON,
      title: `Result: ${prompt.title}`,
      message: response || 'Empty response received from AI.',
      priority: 2
    });
  } catch (error) {
    console.error('Failed to run prompt routine:', error);
    const endTimestamp = new Date().toISOString();

    // Log error entry
    const logId = await addLogEntry(prompt.id, prompt.title, startTimestamp, endTimestamp, 'error', finalPromptText, error.message || 'Unknown error');

    const errorNotificationId = `error|${logId}`;
    showNotification(errorNotificationId, {
      type: 'basic',
      iconUrl: NOTIFICATION_ICON,
      title: `Error in Routine: ${prompt.title}`,
      message: error.message || 'An unknown error occurred during AI execution.',
      priority: 2
    });
  }
}

// Execute GitHub commit polling routine
async function executeGithubRoutine(prompt, routine) {
  const parsed = parseGithubUrl(routine.githubUrl);
  if (!parsed) {
    console.warn('Invalid GitHub URL in routine:', routine.githubUrl);
    return;
  }

  const startTimestamp = new Date().toISOString();
  const { owner, repo } = parsed;

  const storage = await new Promise(r => chrome.storage.local.get(['lastPolledTimes'], r));
  const lastPolledTimes = storage.lastPolledTimes || {};

  let lastPolled = null;
  const entry = lastPolledTimes[routine.id];
  if (entry && entry.url === routine.githubUrl) {
    lastPolled = entry.time;
  }

  let apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits`;
  if (lastPolled) {
    apiUrl += `?since=${encodeURIComponent(lastPolled)}`;
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const commits = await response.json();
    const nowTimestamp = new Date().toISOString();

    lastPolledTimes[routine.id] = {
      time: nowTimestamp,
      url: routine.githubUrl
    };
    await new Promise(r => chrome.storage.local.set({ lastPolledTimes }, r));

    if (!Array.isArray(commits)) {
      throw new Error('Invalid response format: expected array');
    }

    if (commits.length === 0) {
      console.log(`No new commits for ${owner}/${repo} since ${lastPolled}`);
      return;
    }

    // Filter commits list to include only name & message
    const filteredCommits = commits.map(c => ({
      commit: {
        author: {
          name: c.commit?.author?.name || 'Unknown'
        },
        message: c.commit?.message || ''
      }
    }));

    const serializedJson = JSON.stringify(filteredCommits, null, 2);

    await runLanguageModelForPrompt(prompt, routine, serializedJson, startTimestamp);

  } catch (error) {
    const endTimestamp = new Date().toISOString();
    console.warn(`GitHub Polling failed for ${owner}/${repo}:`, error);

    await addLogEntry(
      prompt.id,
      prompt.title,
      startTimestamp,
      endTimestamp,
      'error',
      `GitHub API request to ${apiUrl}`,
      `Warning: GitHub polling failed. Details: ${error.message}`
    );
  }
}

// Listener for triggered scheduled alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.includes('|')) return;

  const [promptId, routineId] = alarm.name.split('|');

  chrome.storage.local.get(['prompts'], async (result) => {
    const prompts = result.prompts || [];
    const prompt = prompts.find(p => p.id === promptId);

    if (!prompt) {
      chrome.alarms.clear(alarm.name);
      return;
    }

    const routine = (prompt.routines || []).find(r => r.id === routineId);
    if (!routine) {
      chrome.alarms.clear(alarm.name);
      return;
    }

    if (routine.type === 'scheduled') {
      await runLanguageModelForPrompt(prompt, routine, 'No input provided for scheduled run.', new Date().toISOString());

      const nextTime = getNextTriggerTime(routine.time, routine.days);
      chrome.alarms.create(alarm.name, { when: nextTime });
    } else if (routine.type === 'github') {
      await executeGithubRoutine(prompt, routine);
    }
  });
});

// Listener for changes in stored prompts to re-sync alarms
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.prompts) {
    syncAlarms(changes.prompts.newValue || []);
  }
});

// Set side panel behavior to open on action button click
function setupSidePanel() {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(err => console.error('Failed to set side panel behavior:', err));
  }
}

// Handle clicks on native push notifications by opening the panel as a tab directly
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.includes('|')) {
    const [status, logId] = notificationId.split('|');

    // Save selected logId to local storage so the panel knows which card to highlight
    chrome.storage.local.set({ selectedLogId: logId }, () => {
      chrome.tabs.create({ url: 'panel.html' });
    });
  }
});

// Run synchronization on extension load or install
chrome.runtime.onInstalled.addListener(() => {
  setupSidePanel();
  chrome.storage.local.get(['prompts'], (result) => {
    if (!result.prompts) {
      chrome.storage.local.set({ prompts: defaultPrompts }, () => {
        syncAlarms(defaultPrompts);
      });
    } else {
      syncAlarms(result.prompts);
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  setupSidePanel();
  chrome.storage.local.get(['prompts'], (result) => {
    syncAlarms(result.prompts || []);
  });
});
