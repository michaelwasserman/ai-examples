# Built-In AI APIs examples

Simple examples using Chrome's Built-In AI APIs.

## [InSite AI Pagebot](https://michaelwasserman.github.io/ai-examples/pagebot.html) - A Floating AI Chat Assistant for Any Website!
A simple drop-in on-device chat bot that can answer questions about a website, summarize page content, and translate responses.

  * Answers user questions about the page using the <a target="_blank" href="https://github.com/webmachinelearning/prompt-api">Prompt API</a>. (Experimental in Chrome 138+)
  * Summarizes the page content using the <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/Summarizer_API">Summarizer API</a> (Available in Chrome 138+)
  * Translates responses using the <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs">Translator API</a> (Available in Chrome 138+)
  * Implemented with generated and tailored plain HTML/JS/CSS, using on-device translation and language models.

Try the predecessor LanguageModel + Summarizer chat mole example created with lmarena.com:
  - [lmarena_chatbot_1a](https://michaelwasserman.github.io/ai-examples/lmarena_chatbot_1a.html) (mistral-medium-2505) got my vote over [lmarena_chatbot_1b](https://michaelwasserman.github.io/ai-examples/lmarena_chatbot_1b.html) (folsom-exp-v1.5)