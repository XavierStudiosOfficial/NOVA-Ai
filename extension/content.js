
(() => {
  // Prevent duplicate installation
  if (window.__NOVA_INSTALLED__) return;
  window.__NOVA_INSTALLED__ = true;

  console.log("[NOVA AI] Website inspection engine loaded.");

  function collectEditors() {
    const results = [];

    // Monaco editor
    document.querySelectorAll(".monaco-editor").forEach((element, index) => {
      const editor = window.monaco?.editor?.getEditors?.()
        ?.find(item => item.getDomNode() === element);

      if (editor) {
        results.push({
          type: "Monaco",
          name: `Monaco Editor ${index + 1}`,
          code: editor.getValue()
        });
      }
    });

    // CodeMirror 6
    document.querySelectorAll(".cm-editor").forEach((element, index) => {
      const view = element.cmView?.view;

      if (view) {
        results.push({
          type: "CodeMirror 6",
          name: `CodeMirror Editor ${index + 1}`,
          code: view.state.doc.toString()
        });
      }
    });

    // CodeMirror 5
    document.querySelectorAll(".CodeMirror").forEach((element, index) => {
      const editor = element.CodeMirror;

      if (editor) {
        results.push({
          type: "CodeMirror 5",
          name: `CodeMirror Editor ${index + 1}`,
          code: editor.getValue()
        });
      }
    });

    // Ace Editor
    document.querySelectorAll(".ace_editor").forEach((element, index) => {
      const editor = window.ace?.edit?.(element);

      if (editor) {
        results.push({
          type: "Ace",
          name: `Ace Editor ${index + 1}`,
          code: editor.getValue()
        });
      }
    });

    // Textareas
    document.querySelectorAll("textarea").forEach((element, index) => {
      if (element.value.trim()) {
        results.push({
          type: "Textarea",
          name: `Text Area ${index + 1}`,
          code: element.value
        });
      }
    });

    // Editable code fields
    document.querySelectorAll('[contenteditable="true"]').forEach((element, index) => {
      const code = element.innerText || "";

      if (code.trim()) {
        results.push({
          type: "Content Editable",
          name: `Editable Field ${index + 1}`,
          code
        });
      }
    });

    // Read-only code blocks
    if (results.length === 0) {
      document.querySelectorAll("pre, code").forEach((element, index) => {
        const code = element.innerText || "";

        if (code.trim()) {
          results.push({
            type: "Read Only",
            name: `Code Block ${index + 1}`,
            code
          });
        }
      });
    }

    return results;
  }

  function collectErrors() {
    return window.__NOVA_ERRORS__ || [];
  }

  window.__NOVA_ERRORS__ = collectErrors();

  window.addEventListener("error", event => {
    window.__NOVA_ERRORS__.push({
      type: "JavaScript Error",
      message: event.message,
      file: event.filename,
      line: event.lineno
    });
  });

  window.addEventListener("unhandledrejection", event => {
    window.__NOVA_ERRORS__.push({
      type: "Unhandled Promise Rejection",
      message: String(event.reason)
    });
  });

  // Allow the extension to request code and errors
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NOVA_COLLECT_CODE") {
      sendResponse({
        editors: collectEditors(),
        errors: collectErrors(),
        page: location.href,
        title: document.title
      });
    }
  });
})();
