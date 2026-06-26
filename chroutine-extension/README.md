# chroutine-extension

This [Web Extension](https://developer.chrome.com/docs/extensions) uses the Prompt API ([Spec](https://github.com/webmachinelearning/prompt-api), [Docs](https://developer.chrome.com/docs/ai/prompt-api)) to automate workflows with on-device inference triggered through routines.

## examples of workflows
- Schedule a prompt to be run at a specific time:
    - https://developer.chrome.com/docs/extensions/reference/api/events
- Respond to events from polling Github repo commits

## minimialist design
The implementation uses concise static vanilla HTML+JS+CSS for ease of understanding. 

- Uses [`local` chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage#example-local) for prompts and routines
- Uses chrome.alarms for scheduled execution
- Supports GitHub REST API polling for repo commit author+message summaries

## testing
To install the extension:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click "Load unpacked"
4. Select the extension `chroutine-extension` directory

To test the extension:
1. Open the extension panel by clicking the extension icon
2. Add a prompt to the library
3. Add a routine with a trigger (e.g. scheduled time) and a prompt
4. The routine will run at the scheduled time and create a notification when done.

# future ideas
- Support more JSON / XML REST APIs, with configurable (ai-gen?) data preprocessing for prompt {{input}}
- Add support for other triggering mechanisms, such as file system changes, keyboard shortcuts, etc.
- Explore comparable web worker use cases and capabilities
- Integrate other AI APIs and maybe even chain usage (summarize a translation, etc.)
