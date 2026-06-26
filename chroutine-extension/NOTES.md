Prompts used for ai-assisted development (most recent first):

========================
Change the extension to appear as a side panel instead of a popup.
Handle clicks on the notification by opening the panel, expanding and highlight the selected execution history entry.
========================
Add a new type of routine trigger to help users monitor GitHub repo commits; the user need only enter the repo URL (e.g. `https://github.com/michaelwasserman/ai-examples` and the extension will setup unauthenticated chrome.alarms polling of the REST API per https://docs.github.com/en/rest/commits/commits?apiVersion=2026-03-10 with the `since` query param set to the last time it was polled (`since` is omitted for the first call). Let the user choose high(once-per-minute) or daily polling frequency. The first request should be immediate regardless.

If the response has an error, log a warning to the console and in the execution history.

If the response is valid and not empty: parse the response JSON, creating a copy that only contains the following fields:
- "commit": { "author": { "name":
- "commit": { "message":
Use that serialized JSON as the {{input}} for the LanguageModel API prompt template. Add a defaultPrompt entry that includes this routine for https://github.com/michaelwasserman/ai-examples with a prompt that asks for a concise summary of the changes that would give the user an idea of updates made to an , to notify a user interested in the repository's progress.

Trigger the shared extension notification codepath with the LanguageModel API response.
========================
The chrome.notification didn't appear for my first test; help ensure the prompt is shown to the user. Also, store logs for each prompt execution containing start/end timestamps, input, and output; add collapsible UI letting users browse the history of completed prompt executions
========================
Update the LanguageModel API usage to match the spec and docs:
https://github.com/webmachinelearning/prompt-api
https://developer.chrome.com/docs/ai/prompt-api
========================
Add internal logic to add/edit/delete [chrome.events](https://developer.chrome.com/docs/extensions/reference/api/events) in accordance with scheduled prompt metadata changes when users save or delete prompts. Each prompt should have an internal id that persists across edits, and is used as reference for scheduling updates.

The event should wake the worker.js script, to look up the stored prompt by id, and execute the [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) using the stored prompt text.
========================
Give each prompt entry editable metadata for routine execution.

The first supported routine type is repeating scheduled execution: add form buttons and fields for users to add/edit/delete entries listing the time for a prompt to run, with single letter toggle buttons (S M T W T F S) for each day of the week. This naturally lets users set a prompt to run e.g. every weekday at 8am or Mondays at 1pm.

Extend the prompt editing local storage with this metadata, with room for other types of routines to be added in the future.
========================
Move CSS to a separate file
========================
Add some very basic static vanilla HTML+JS+CSS to let users add/remove/edit text prompts in panel.html and store them in `local` chrome.storage https://developer.chrome.com/docs/extensions/reference/api/storage#example-local
========================
