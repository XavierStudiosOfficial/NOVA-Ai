
const SERVER_URL = "http://127.0.0.1:8787";

const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const inspectBtn = document.getElementById("inspectBtn");
const errorsBtn = document.getElementById("errorsBtn");
const projectBtn = document.getElementById("projectBtn");
const fixBtn = document.getElementById("fixBtn");

let busy = false;

function addMessage(sender, message) {
  const container = document.createElement("div");
  container.className =
    "message " + (sender === "YOU" ? "user-message" : "nova-message");

  const name = document.createElement("strong");
  name.textContent = sender;

  const content = document.createElement("p");
  content.textContent = message;

  container.append(name, content);
  chatMessages.appendChild(container);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askNOVA(message) {
  if (busy || !message.trim()) return;

  busy = true;
  sendBtn.disabled = true;

  addMessage("YOU", message);
  const loading = document.createElement("div");
  loading.className = "message nova-message";
  loading.textContent = "NOVA is thinking...";
  chatMessages.appendChild(loading);

  try {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    loading.remove();

    if (!response.ok) {
      throw new Error(data.error || "The server returned an error.");
    }

    addMessage("NOVA", data.reply || "I received an empty response.");
  } catch (error) {
    loading.remove();
    addMessage("NOVA", `Connection error: ${error.message}`);
  } finally {
    busy = false;
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();

  if (!message) return;

  messageInput.value = "";
  askNOVA(message);
});

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendBtn.click();
  }
});

// Get information about the active browser tab
async function getActiveTab() {
  return await chrome.runtime.sendMessage({
    type: "NOVA_GET_TAB"
  });
}

// Collect code and errors from the current website
async function inspectCurrentPage() {
  const tab = await getActiveTab();

  if (!tab || !tab.tabId || !tab.url) {
    throw new Error("Cannot access this browser tab.");
  }

  if (!/^https?:\/\//i.test(tab.url)) {
    throw new Error("NOVA cannot inspect Chrome internal pages.");
  }

  const permission = await chrome.runtime.sendMessage({
    type: "NOVA_REQUEST_PERMISSION",
    url: tab.url
  });

  if (!permission?.granted) {
    throw new Error("Website permission was not granted.");
  }

  const injection = await chrome.runtime.sendMessage({
    type: "NOVA_INSPECT",
    tabId: tab.tabId,
    url: tab.url
  });

  if (!injection?.success) {
    throw new Error(injection?.error || "Could not inspect this page.");
  }

  // Give the content script a moment to initialize
  await new Promise(resolve => setTimeout(resolve, 300));

  const result = await chrome.tabs.sendMessage(tab.tabId, {
    type: "NOVA_COLLECT_CODE"
  });

  return result;
}

inspectBtn.addEventListener("click", async () => {
  try {
    addMessage("NOVA", "Inspecting the current website...");
    const result = await inspectCurrentPage();

    const editors = result.editors || [];

    if (!editors.length) {
      addMessage("NOVA", "I couldn't find readable code editors on this page. Try opening a code editor first.");
      return;
    }

    const summary = editors.map((editor, index) =>
      `Editor ${index + 1}: ${editor.name} (${editor.type})\n${editor.code}`
    ).join("\n\n");

    await askNOVA(
      `Analyze the following code from ${result.title}.\n\n${summary}\n\nExplain what this code does and identify possible problems.`
    );
  } catch (error) {
    addMessage("NOVA", error.message);
  }
});

errorsBtn.addEventListener("click", async () => {
  try {
    addMessage("NOVA", "Checking the current website for detected errors...");

    const result = await inspectCurrentPage();
    const errors = result.errors || [];

    if (!errors.length) {
      addMessage("NOVA", "No JavaScript errors have been detected by NOVA since inspection began.");
      return;
    }

    await askNOVA(
      `Explain these detected website errors and suggest fixes:\n\n${JSON.stringify(errors, null, 2)}`
    );
  } catch (error) {
    addMessage("NOVA", error.message);
  }
});

projectBtn.addEventListener("click", async () => {
  try {
    addMessage("NOVA", "Looking for accessible project code...");

    const result = await inspectCurrentPage();
    const editors = result.editors || [];

    if (!editors.length) {
      addMessage("NOVA", "No readable project code was found on this page.");
      return;
    }

    const projectCode = editors.map(editor =>
      `FILE/EDITOR: ${editor.name}\n${editor.code}`
    ).join("\n\n");

    await askNOVA(
      `Act as a senior software architect. Analyze the accessible code from this page.\n\n${projectCode}\n\nExplain the project structure visible here, how the code works, and possible improvements. Be clear about anything you cannot see.`
    );
  } catch (error) {
    addMessage("NOVA", error.message);
  }
});

fixBtn.addEventListener("click", async () => {
  try {
    addMessage("NOVA", "Preparing a code review...");

    const result = await inspectCurrentPage();
    const editors = result.editors || [];

    if (!editors.length) {
      addMessage("NOVA", "I couldn't find readable code to review.");
      return;
    }

    const code = editors.map(editor =>
      `${editor.name}:\n${editor.code}`
    ).join("\n\n");

    await askNOVA(
      `Review this code as an expert programmer. Find bugs and suggest improvements. Show proposed fixes with explanations. Do NOT claim to have edited the original code.\n\n${code}`
    );
  } catch (error) {
    addMessage("NOVA", error.message);
  }
});

console.log("[NOVA AI] Side panel initialized.");
