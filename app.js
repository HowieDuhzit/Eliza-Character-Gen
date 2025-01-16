document.addEventListener("DOMContentLoaded", () => {
  // Track mouse position for tooltips
  document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty(
      "--mouse-x",
      `${e.clientX + 20}px`
    );
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  });

  // Handle browser extension errors
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.message?.includes("message port closed") ||
      event.reason?.message?.includes("crypto.randomUUID")
    ) {
      event.preventDefault(); // Prevent the error from showing in console
    }
  });

  window.addEventListener(
    "error",
    (e) => {
      if (
        e.message.includes("The message port closed") ||
        e.message.includes("crypto.randomUUID") ||
        e.message.includes("Failed to fetch chrome-extension")
      ) {
        e.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  // DOM Elements
  const characterPrompt = document.getElementById("character-prompt");
  const generateFromPromptBtn = document.getElementById("generate-from-prompt");
  const promptStatus = document.getElementById("prompt-status");
  const processingStatus = document.getElementById("processing-status");
  const dropZone = document.getElementById("drop-zone");
  const fileList = document.getElementById("file-list");
  const downloadBtn = document.getElementById("download-json");
  const knowledgeContent = document.getElementById("knowledge-content");
  const addExampleBtn = document.getElementById("add-example");
  const messageExamplesContainer = document.getElementById(
    "message-examples-container"
  );
  const modelSelect = document.getElementById("model-select");
  const apiKeyInput = document.getElementById("api-key");
  const saveKeyBtn = document.getElementById("save-key");
  const apiKeyStatus = document.getElementById("api-key-status");
  const characterDropZone = document.getElementById("character-drop-zone");
  const characterFileStatus = document.getElementById("character-file-status");
  const characterFileInput = document.getElementById("character-file-input");
  const characterFileButton = document.getElementById("character-file-button");
  const fileInput = document.getElementById("file-input");
  const fileButton = document.getElementById("file-button");
  const generateJsonBtn = document.getElementById("generate-json");
  const peopleContainer = document.getElementById("people-container");
  const addPersonBtn = document.getElementById("add-person");
  const adjectivesContainer = document.getElementById("adjectives-container");
  const addAdjectiveBtn = document.getElementById("add-adjective");
  const processKnowledgeBtn = document.getElementById("process-knowledge");
  const knowledgeEntries = document.getElementById("knowledge-entries");
  const addKnowledgeBtn = document.getElementById("add-knowledge");
  const clientToggles = document.querySelectorAll(".client-toggle");

  // Character form elements
  const characterName = document.getElementById("character-name");
  const modelProvider = document.getElementById("model-provider");
  const voiceModel = document.getElementById("voice-model");
  const bioInput = document.getElementById("bio");
  const loreInput = document.getElementById("lore");
  const topicsInput = document.getElementById("topics");
  const styleAllInput = document.getElementById("style-all");
  const styleChatInput = document.getElementById("style-chat");
  const stylePostInput = document.getElementById("style-post");
  const adjectivesInput = document.getElementById("adjectives");
  const postExamplesInput = document.getElementById("post-examples");

  // Constants
  const API_KEY_STORAGE_KEY = "openrouter_api_key";
  const API_BASE_URL = window.location.origin;
  const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const BACKUP_KEY_PREFIX = "character_backup_";
  const DEFAULT_BACKUP_NAME = "Autosave";

  // Store files and current character data
  let collectedFiles = [];
  let currentCharacterData = null;

  // Helper Functions
  const updateKnowledgeDisplay = (knowledge = []) => {
    if (knowledgeEntries) {
      knowledgeEntries.innerHTML = "";
      if (knowledge.length) {
        knowledge.forEach((entry) => {
          knowledgeEntries.appendChild(createKnowledgeEntry(entry));
        });
        updateKnowledgeNumbers();
      } else {
        knowledgeEntries.innerHTML =
          '<div class="no-knowledge">No knowledge entries yet</div>';
      }
    }
  };

  const splitIntoSentences = (text) => {
    //console.log(text, "<<< input");
    if (!text || typeof text !== "string" || text.trim() === "") {
      return [];
    }
    return text
      .split("\n") // Split by newline
      .map((line) => line.trim()) // Trim each line
      .filter((line) => line.length > 0); // Remove empty lines
  };

  const splitAdjectives = (text) => {
    if (!text || typeof text !== "string" || text.trim() === "") {
      return [];
    }
    return text
      .split(/\s+/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length > 0);
  };

  const createMessageExample = () => {
    const example = document.createElement("div");
    example.className = "message-example";
    example.innerHTML = `
              <div class="message-pair">
                  <textarea placeholder="Write an example user message..." class="user-message"></textarea>
              </div>
              <div class="message-pair">
                  <textarea placeholder="Write the character's response..." class="character-message"></textarea>
              </div>
              <button class="action-button delete-button" title="Remove Example">×</button>
          `;
    example.querySelector(".delete-button").addEventListener("click", () => {
      example.remove();
    });
    return example;
  };

  const collectMessageExamples = () => {
    return Array.from(
      messageExamplesContainer.querySelectorAll(".message-example")
    )
      .map((example) => {
        const userMessage = example.querySelector(".user-message").value.trim();
        const charMessage = example
          .querySelector(".character-message")
          .value.trim();
        if (!userMessage && !charMessage) return null;
        return [
          {
            user: "{{user1}}",
            content: { text: userMessage || "" },
          },
          {
            user: characterName.value || "character",
            content: { text: charMessage || "" },
          },
        ];
      })
      .filter((example) => example !== null);
  };

  const createPersonEntry = (value = "") => {
    const entry = document.createElement("div");
    entry.className = "person-entry";
    entry.innerHTML = `
              <input type="text" class="person-name" placeholder="Enter person's name" value="${value}">
              <button class="action-button delete-button" title="Remove Person">×</button>
          `;
    entry.querySelector(".delete-button").addEventListener("click", () => {
      entry.remove();
    });
    return entry;
  };

  const createAdjectiveEntry = (value = "") => {
    const entry = document.createElement("div");
    entry.className = "adjective-entry";
    entry.innerHTML = `
              <input type="text" class="adjective-name" placeholder="Enter an adjective" value="${value}">
              <button class="action-button delete-button" title="Remove Adjective">×</button>
          `;
    entry.querySelector(".delete-button").addEventListener("click", () => {
      entry.remove();
    });
    return entry;
  };

  const createPostEntry = (value = "") => {
    const entry = document.createElement("div");
    entry.className = "post-entry";
    entry.innerHTML = `
              <textarea class="post-content" placeholder="Write an example post">${value}</textarea>
              <button class="action-button delete-button" title="Remove Post">×</button>
          `;
    entry.querySelector(".delete-button").addEventListener("click", () => {
      entry.remove();
    });
    return entry;
  };

  const collectCharacterData = (knowledge = []) => {
    console.log("collecting...");
    // Get all current field values
    const messageExamples = collectMessageExamples();
    const adjectives = Array.from(
      adjectivesContainer.querySelectorAll(".adjective-name")
    )
      .map((input) => input.value.trim().toLowerCase())
      .filter((adj) => adj.length > 0);
    const people = Array.from(peopleContainer.querySelectorAll(".person-name"))
      .map((input) => input.value.trim())
      .filter((name) => name.length > 0);
    const knowledgeLines = Array.from(
      knowledgeEntries.querySelectorAll(".knowledge-text")
    )
      .map((input) => input.value.trim())
      .filter((text) => text.length > 0)
      .map((text) => (text.endsWith(".") ? text : text + "."));
    const selectedClients = getSelectedClients();

    return {
      name: characterName.value || "",
      clients: selectedClients,
      modelProvider: modelProvider.value || "",
      settings: {
        secrets: {},
        voice: {
          model: voiceModel.value || "",
        },
      },
      plugins: [],
      bio: splitIntoSentences(bioInput.value),
      lore: splitIntoSentences(loreInput.value),
      knowledge: knowledgeLines.length ? knowledgeLines : knowledge || [],
      messageExamples: messageExamples,
      postExamples: splitIntoSentences(postExamplesInput.value),
      topics: splitIntoSentences(topicsInput.value),
      style: {
        all: splitIntoSentences(styleAllInput.value),
        chat: splitIntoSentences(styleChatInput.value),
        post: splitIntoSentences(stylePostInput.value),
      },
      adjectives: adjectives,
      people: people,
    };
  };

  const displayResults = (knowledge) => {
    currentCharacterData = collectCharacterData(knowledge);
    updateKnowledgeDisplay(currentCharacterData.knowledge);
    knowledgeContent.innerHTML = `<pre>${JSON.stringify(
      currentCharacterData,
      null,
      2
    )}</pre>`;
    downloadBtn.disabled = false;
  };

  const populateFormFields = (data) => {
    console.log("Populating form fields with data:", data);

    // Store the loaded character data
    currentCharacterData = data;

    // Set model provider dropdown
    if (data.modelProvider) {
      const modelOption = Array.from(modelProvider.options).find(
        (option) => option.value === data.modelProvider
      );
      if (modelOption) {
        modelProvider.value = data.modelProvider;
      } else {
        // If the model isn't in the dropdown, add it
        const newOption = new Option(data.modelProvider, data.modelProvider);
        modelProvider.add(newOption);
        modelProvider.value = data.modelProvider;
      }
    } else {
      modelProvider.value = "";
    }

    // Set client toggles
    clientToggles.forEach((toggle) => {
      const isActive = data.clients?.includes(toggle.dataset.client) || false;
      toggle.classList.toggle("active", isActive);
    });

    // Update knowledge display if character has knowledge
    if (Array.isArray(data.knowledge)) {
      updateKnowledgeDisplay(data.knowledge);
    }

    const examples =
      messageExamplesContainer.querySelectorAll(".message-example");
    examples.forEach((example) => example.remove());

    // Basic Information
    characterName.value = data.name || "";
    modelProvider.value = data.modelProvider || "";
    voiceModel.value = data.settings?.voice?.model || "";

    // Character Details
    bioInput.value = data.bio?.join("\n") || "";
    loreInput.value = data.lore?.join("\n") || "";
    topicsInput.value = data.topics?.join("\n") || "";

    // Style
    styleAllInput.value = data.style?.all?.join("\n") || "";
    styleChatInput.value = data.style?.chat?.join("\n") || "";
    stylePostInput.value = data.style?.post?.join("\n") || "";

    // Post Examples
    postExamplesInput.value = data.postExamples?.join("\n") || "";

    // Clear and populate adjectives
    adjectivesContainer.innerHTML = "";
    if (Array.isArray(data.adjectives)) {
      data.adjectives.forEach((adj) => {
        adjectivesContainer.appendChild(createAdjectiveEntry(adj));
      });
    }
    if (!data.adjectives?.length) {
      adjectivesContainer.appendChild(createAdjectiveEntry());
    }

    // Clear and populate people
    peopleContainer.innerHTML = "";
    if (Array.isArray(data.people)) {
      data.people.forEach((person) => {
        peopleContainer.appendChild(createPersonEntry(person));
      });
    }
    if (!data.people?.length) {
      peopleContainer.appendChild(createPersonEntry());
    }

    // Message Examples
    data.messageExamples?.forEach((example) => {
      const exampleElement = createMessageExample();
      const userMessage = exampleElement.querySelector(".user-message");
      const charMessage = exampleElement.querySelector(".character-message");

      userMessage.value = example[0]?.content?.text || "";
      charMessage.value = example[1]?.content?.text || "";

      messageExamplesContainer.appendChild(exampleElement);
    });

    if (!data.messageExamples?.length) {
      const example = createMessageExample();
      messageExamplesContainer.appendChild(example);
    }

    // Update the debug output without regenerating the character
    knowledgeContent.innerHTML = `<pre>${JSON.stringify(
      currentCharacterData,
      null,
      2
    )}</pre>`;
    downloadBtn.disabled = false;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === "Failed to fetch") {
        throw new Error(
          "Cannot connect to server. Please ensure the server is running."
        );
      }
      throw error;
    }
  };

  // Event Handlers
  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.parentElement;
      section.classList.toggle("collapsed");
    });
  });

  const checkSavedApiKey = () => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const apiKeyInput = document.getElementById("api-key-input");
    const apiKeyStatus = document.getElementById("api-key-status");
    const statusText = apiKeyStatus.querySelector(".status-text");

    if (savedKey) {
      apiKeyInput.style.display = "none";
      apiKeyStatus.style.display = "flex";
      statusText.textContent = "API key is set";
      apiKeyInput.value = "";
    } else {
      apiKeyInput.style.display = "flex";
      apiKeyStatus.style.display = "none";
    }
  };

  saveKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert("Please enter an API key");
      return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    checkSavedApiKey();
  });

  document.getElementById("remove-key").addEventListener("click", () => {
    if (confirm("Are you sure you want to remove your API key?")) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      checkSavedApiKey();
    }
  });

  modelSelect.addEventListener("change", () => {
    const selectedModel = modelSelect.value;
    if (selectedModel) {
      const provider = selectedModel.split("/")[0];
      modelProvider.value = provider;
    }
  });

  addExampleBtn.addEventListener("click", () => {
    const example = createMessageExample();
    messageExamplesContainer.appendChild(example);
  });

  // Character file button handler
  characterFileButton.addEventListener("click", () => {
    characterFileInput.click();
  });

  characterFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      characterFileStatus.textContent = "Please select a JSON file";
      characterFileStatus.className = "error";
      return;
    }

    characterFileStatus.textContent = "Loading character...";
    characterFileStatus.className = "";

    try {
      const content = await file.text();
      let characterData;

      try {
        characterData = JSON.parse(content);
        console.log("Loaded character data:", characterData);
      } catch (parseError) {
        const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (!apiKey) {
          throw new Error(
            "Please set your OpenRouter API key to fix JSON formatting"
          );
        }

        characterFileStatus.textContent = "Fixing JSON formatting...";
        const response = await apiCall("/api/fix-json", {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ content }),
        });
        characterData = response.character;
      }

      populateFormFields(characterData);
      characterFileStatus.textContent = "Character loaded successfully";
      characterFileStatus.className = "success";
    } catch (error) {
      console.error("Character loading error:", error);
      characterFileStatus.textContent = `Error: ${error.message}`;
      characterFileStatus.className = "error";
    }
  });

  // Generate JSON button handler
  generateJsonBtn.addEventListener("click", async () => {
    // Generate character with current knowledge
    displayResults(currentCharacterData?.knowledge || []);
    knowledgeContent.scrollIntoView({ behavior: "smooth" });
  });

  // File input and drop handlers
  fileButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  });

  const addFiles = (files) => {
    collectedFiles = [...collectedFiles, ...files];
    updateFileList();
  };

  const updateFileList = () => {
    fileList.innerHTML = collectedFiles
      .map(
        (file, index) => `
              <div class="file-item">
                  <span class="file-name">${file.name}</span>
                  <span class="file-size">${formatFileSize(file.size)}</span>
                  <button class="remove-file" onclick="window.removeFile(${index})">×</button>
              </div>
          `
      )
      .join("");
  };

  window.removeFile = (index) => {
    collectedFiles.splice(index, 1);
    updateFileList();
  };

  generateFromPromptBtn.addEventListener("click", async () => {
    const prompt = characterPrompt.value.trim();
    const selectedModel = modelSelect.value;
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);

    if (!prompt) {
      promptStatus.textContent = "Please enter a prompt";
      promptStatus.className = "error";
      return;
    }

    if (!selectedModel) {
      promptStatus.textContent = "Please select a model";
      promptStatus.className = "error";
      return;
    }

    if (!apiKey) {
      promptStatus.textContent = "Please set your OpenRouter API key";
      promptStatus.className = "error";
      return;
    }

    promptStatus.textContent = "Generating character...";
    promptStatus.className = "";
    generateFromPromptBtn.disabled = true;

    try {
      const data = await apiCall("/api/generate-character", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
        }),
      });

      populateFormFields(data.character);
      promptStatus.textContent = "Character generated successfully";
      promptStatus.className = "success";
    } catch (error) {
      console.error("Generation error:", error);
      promptStatus.textContent = `Error: ${error.message}`;
      promptStatus.className = "error";
    } finally {
      generateFromPromptBtn.disabled = false;
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!currentCharacterData) return;

    const blob = new Blob([JSON.stringify(currentCharacterData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentCharacterData.name || "character"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  checkSavedApiKey();
  addExampleBtn.click();

  // Add these event listeners for the character drop zone
  characterDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    characterDropZone.classList.add("drag-over");
  });

  characterDropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    characterDropZone.classList.remove("drag-over");
  });

  characterDropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    characterDropZone.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/json") {
        try {
          const text = await file.text();
          let characterData;
          try {
            characterData = JSON.parse(text);
            console.log("Loaded character data (drag/drop):", characterData);
          } catch (parseError) {
            const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (!apiKey) {
              throw new Error(
                "Please set your OpenRouter API key to fix JSON formatting"
              );
            }

            characterFileStatus.textContent = "Fixing JSON formatting...";
            const response = await apiCall("/api/fix-json", {
              method: "POST",
              headers: {
                "X-API-Key": apiKey,
              },
              body: JSON.stringify({ content: text }),
            });
            characterData = response.character;
          }

          populateFormFields(characterData);
          characterFileStatus.textContent = "Character loaded successfully!";
          characterFileStatus.className = "success";
        } catch (error) {
          console.error("Character loading error:", error);
          characterFileStatus.textContent =
            "Error loading character file: " + error.message;
          characterFileStatus.className = "error";
        }
      } else {
        characterFileStatus.textContent = "Please upload a JSON file.";
        characterFileStatus.className = "error";
      }
    }
  });

  // Add this helper function to load the character data into the form
  function loadCharacterData(data) {
    // Basic Information
    document.getElementById("character-name").value = data.name || "";
    document.getElementById("model-provider").value = data.modelProvider || "";
    document.getElementById("voice-model").value = data.voiceModel || "";

    // Character Details
    document.getElementById("bio").value = data.bio?.join("\n") || "";
    document.getElementById("lore").value = data.lore?.join("\n") || "";
    document.getElementById("topics").value = data.topics?.join("\n") || "";

    // Style
    document.getElementById("style-all").value =
      data.style?.all?.join("\n") || "";
    document.getElementById("style-chat").value =
      data.style?.chat?.join("\n") || "";
    document.getElementById("style-post").value =
      data.style?.post?.join("\n") || "";

    // Examples
    document.getElementById("post-examples").value =
      data.examples?.posts?.join("\n") || "";

    // Adjectives
    document.getElementById("adjectives").value =
      data.adjectives?.join(" ") || "";
  }

  // Update backup functions
  const saveBackup = (name = DEFAULT_BACKUP_NAME) => {
    // Always collect current field values
    const currentKnowledge = currentCharacterData?.knowledge || [];
    currentCharacterData = collectCharacterData(currentKnowledge);

    const backup = {
      name: name || DEFAULT_BACKUP_NAME,
      timestamp: new Date().toISOString(),
      data: currentCharacterData,
    };
    const key =
      BACKUP_KEY_PREFIX +
      (name || DEFAULT_BACKUP_NAME).replace(/\s+/g, "_").toLowerCase();
    localStorage.setItem(key, JSON.stringify(backup));
    updateBackupList();
    console.log("Backup saved:", backup);
  };

  const loadBackup = (name = DEFAULT_BACKUP_NAME) => {
    const key = BACKUP_KEY_PREFIX + name.replace(/\s+/g, "_").toLowerCase();
    const backupJson = localStorage.getItem(key);
    if (backupJson) {
      try {
        const backup = JSON.parse(backupJson);
        console.log("Found backup:", backup);
        return backup;
      } catch (error) {
        console.error("Error loading backup:", error);
        return null;
      }
    }
    return null;
  };

  const getAllBackups = () => {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(BACKUP_KEY_PREFIX)) {
        try {
          const backup = JSON.parse(localStorage.getItem(key));
          backups.push(backup);
        } catch (error) {
          console.error("Error loading backup:", error);
        }
      }
    }
    return backups.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  };

  const deleteBackup = (name) => {
    const key = BACKUP_KEY_PREFIX + name.replace(/\s+/g, "_").toLowerCase();
    localStorage.removeItem(key);
    updateBackupList();
  };

  const updateBackupList = () => {
    const backupList = document.getElementById("backup-list");
    const backups = getAllBackups();

    backupList.innerHTML = backups
      .map(
        (backup) => `
              <div class="backup-item">
                  <input type="text" class="backup-name" value="${backup.name}" 
                      title="${new Date(backup.timestamp).toLocaleString()}"
                      onchange="window.renameBackup('${
                        backup.name
                      }', this.value)">
                  <button onclick="window.loadBackupByName('${backup.name}')" 
                      class="action-button load-button" title="Load backup">
                      <i class="fa-solid fa-folder-open"></i>
                  </button>
                  <button onclick="window.deleteBackupByName('${backup.name}')" 
                      class="action-button delete-button" title="Delete backup">
                      <i class="fa-solid fa-trash"></i>
                  </button>
              </div>
          `
      )
      .join("");
  };

  // Add these to window for the onclick handlers
  window.loadBackupByName = (name) => {
    const backup = loadBackup(name);
    if (backup) {
      // Store the backup data as current character
      currentCharacterData = backup.data;

      // Populate form fields and display knowledge
      populateFormFields(currentCharacterData);

      // Update knowledge display
      if (Array.isArray(currentCharacterData.knowledge)) {
        updateKnowledgeDisplay(currentCharacterData.knowledge);
      }

      // Update debug output
      knowledgeContent.innerHTML = `<pre>${JSON.stringify(
        currentCharacterData,
        null,
        2
      )}</pre>`;
      downloadBtn.disabled = false;
    }
  };

  window.deleteBackupByName = (name) => {
    if (confirm(`Are you sure you want to delete the backup "${name}"?`)) {
      deleteBackup(name);
    }
  };

  window.renameBackup = (oldName, newName) => {
    if (newName && oldName !== newName) {
      const backup = loadBackup(oldName);
      if (backup) {
        deleteBackup(oldName);
        backup.name = newName;
        const key =
          BACKUP_KEY_PREFIX + newName.replace(/\s+/g, "_").toLowerCase();
        localStorage.setItem(key, JSON.stringify(backup));
        updateBackupList();
      }
    }
  };

  // Add saveBackup to window object
  window.saveBackup = (name) => {
    if (!name || name.trim() === "") {
      alert("Please enter a backup name");
      return;
    }
    saveBackup(name);
    document.getElementById("new-backup-name").value = ""; // Clear the input after saving
  };

  // Initialize backup list
  updateBackupList();

  // Set up automatic backup
  setInterval(saveBackup, BACKUP_INTERVAL);

  // Add backup before unload
  window.addEventListener("beforeunload", saveBackup);

  // Add this event listener with others
  addPersonBtn.addEventListener("click", () => {
    peopleContainer.appendChild(createPersonEntry());
  });

  // Initialize with one empty person entry
  peopleContainer.appendChild(createPersonEntry());

  // Add these event listeners
  addAdjectiveBtn.addEventListener("click", () => {
    adjectivesContainer.appendChild(createAdjectiveEntry());
  });

  // Initialize with empty entries
  adjectivesContainer.appendChild(createAdjectiveEntry());

  // Add process knowledge button handler
  processKnowledgeBtn.addEventListener("click", async () => {
    if (collectedFiles.length === 0) {
      processingStatus.textContent = "No files to process";
      processingStatus.className = "error";
      return;
    }

    processingStatus.textContent = "Processing knowledge files...";
    processingStatus.className = "";
    processKnowledgeBtn.disabled = true;

    try {
      const formData = new FormData();
      collectedFiles.forEach((file) => {
        console.log("Appending file:", file.name);
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/api/process-files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Processed data:", data);

      // Get existing knowledge
      const existingKnowledge = currentCharacterData?.knowledge || [];

      // Combine existing and new knowledge
      const combinedKnowledge = [
        ...existingKnowledge,
        ...(data.knowledge || []),
      ];

      // Update only the knowledge display
      updateKnowledgeDisplay(combinedKnowledge);

      // Update the currentCharacterData with new knowledge
      if (currentCharacterData) {
        currentCharacterData.knowledge = combinedKnowledge;
      } else {
        currentCharacterData = { knowledge: combinedKnowledge };
      }

      // Clear processed files
      collectedFiles = [];
      updateFileList();

      processingStatus.textContent = "Knowledge files processed successfully";
      processingStatus.className = "success";
    } catch (error) {
      console.error("Processing error:", error);
      processingStatus.textContent = `Error processing knowledge: ${error.message}`;
      processingStatus.className = "error";
    } finally {
      processKnowledgeBtn.disabled = false;
    }
  });

  const createKnowledgeEntry = (value = "") => {
    const entry = document.createElement("div");
    entry.className = "knowledge-entry";
    entry.innerHTML = `
              <span class="entry-number"></span>
              <input type="text" class="knowledge-text" value="${value}" placeholder="Enter knowledge...">
              <button class="action-button delete-button" title="Remove Knowledge">×</button>
          `;

    entry.querySelector(".delete-button").addEventListener("click", () => {
      entry.remove();
      updateKnowledgeNumbers();
      updateCurrentKnowledge();
    });

    entry
      .querySelector("input")
      .addEventListener("change", updateCurrentKnowledge);
    return entry;
  };

  const updateKnowledgeNumbers = () => {
    knowledgeEntries
      .querySelectorAll(".knowledge-entry")
      .forEach((entry, index) => {
        entry.querySelector(".entry-number").textContent = `${index + 1}.`;
      });
  };

  const updateCurrentKnowledge = () => {
    if (currentCharacterData) {
      const knowledgeLines = Array.from(
        knowledgeEntries.querySelectorAll(".knowledge-text")
      )
        .map((input) => input.value.trim())
        .filter((text) => text.length > 0)
        .map((text) => (text.endsWith(".") ? text : text + "."));

      currentCharacterData.knowledge = knowledgeLines;
    }
  };

  // Add knowledge button handler
  addKnowledgeBtn.addEventListener("click", () => {
    if (knowledgeEntries.querySelector(".no-knowledge")) {
      knowledgeEntries.innerHTML = "";
    }
    const entry = createKnowledgeEntry();
    knowledgeEntries.appendChild(entry);
    updateKnowledgeNumbers();
    entry.querySelector("input").focus();
  });

  // Initialize client toggles
  clientToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      if (currentCharacterData) {
        currentCharacterData.clients = getSelectedClients();
      }
    });
  });

  // Helper function to get selected clients
  const getSelectedClients = () => {
    return Array.from(document.querySelectorAll(".client-toggle.active")).map(
      (toggle) => toggle.dataset.client
    );
  };

  // Theme toggle functionality
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");

  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem("theme");
  const widget = document.querySelector("gecko-coin-ticker-widget");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeIcon.className =
      savedTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    if (widget) {
      widget.setAttribute(
        "dark-mode",
        savedTheme === "dark" ? "true" : "false"
      );
    }
  } else {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.setAttribute(
      "data-theme",
      systemPrefersDark ? "dark" : "light"
    );
    themeIcon.className = systemPrefersDark
      ? "fa-solid fa-sun"
      : "fa-solid fa-moon";
    if (widget) {
      widget.setAttribute("dark-mode", systemPrefersDark ? "true" : "false");
    }
  }

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeIcon.className =
      newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";

    // Update widget theme
    const widget = document.querySelector("gecko-coin-ticker-widget");
    if (widget) {
      widget.setAttribute("dark-mode", newTheme === "dark" ? "true" : "false");
    }
  });

  // Add this with the other DOM element declarations at the top
  const refinePromptInput = document.getElementById("refine-prompt");
  const refineCharacterBtn = document.getElementById("refine-character");
  const refineStatus = document.getElementById("refine-status");

  // Add this event listener with the other initialization code
  refineCharacterBtn.addEventListener("click", async () => {
    const refinePrompt = characterPrompt.value.trim();
    const selectedModel = modelSelect.value;
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);

    if (!currentCharacterData) {
      promptStatus.textContent =
        "No character data to refine. Please generate or load a character first.";
      promptStatus.className = "error";
      return;
    }

    if (!refinePrompt) {
      promptStatus.textContent = "Please enter refinement instructions";
      promptStatus.className = "error";
      return;
    }

    if (!selectedModel) {
      promptStatus.textContent = "Please select a model";
      promptStatus.className = "error";
      return;
    }

    if (!apiKey) {
      promptStatus.textContent = "Please set your OpenRouter API key";
      promptStatus.className = "error";
      return;
    }

    promptStatus.textContent = "Refining character...";
    promptStatus.className = "";
    refineCharacterBtn.disabled = true;

    try {
      const response = await apiCall("/api/refine-character", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          prompt: refinePrompt,
          model: selectedModel,
          currentCharacter: currentCharacterData,
        }),
      });

      populateFormFields(response.character);
      promptStatus.textContent = "Character refined successfully";
      promptStatus.className = "success";
      characterPrompt.value = "";
    } catch (error) {
      console.error("Refinement error:", error);
      promptStatus.textContent = `Error: ${error.message}`;
      promptStatus.className = "error";
    } finally {
      refineCharacterBtn.disabled = false;
    }
  });

  // Affiliate dropdown functionality
  const affiliateToggle = document.getElementById("affiliate-toggle");
  const affiliatePanel = document.querySelector(".affiliate-panel");

  affiliateToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    affiliateToggle.classList.toggle("active");
    affiliatePanel.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !affiliatePanel.contains(e.target) &&
      !affiliateToggle.contains(e.target)
    ) {
      affiliateToggle.classList.remove("active");
      affiliatePanel.classList.remove("active");
    }
  });

  // Add this with your other event listeners
  document.querySelector(".santa-hat").addEventListener("click", function () {
    const hohoho = document.querySelector(".ho-ho-ho");
    hohoho.classList.remove("active"); // Reset animation
    void hohoho.offsetWidth; // Force reflow
    hohoho.classList.add("active");
  });

  // Add this near the top with other DOM element declarations
  const secretButton = document.getElementById("secret-holiday-toggle");
  const snowContainer = document.querySelector(".snow-container");
  const santaHat = document.querySelector(".santa-hat");
  const hohoho = document.querySelector(".ho-ho-ho");

  // Add this with other initialization code
  // Initialize holiday features
  const holidayMode = localStorage.getItem("holidayMode") === "true";
  if (holidayMode) {
    snowContainer.style.display = "block";
    santaHat.style.display = "block";
    hohoho.style.display = "block";
  }

  // Holiday toggle button
  secretButton.addEventListener("click", function () {
    const currentDisplay = snowContainer.style.display;
    const newDisplay = currentDisplay === "none" ? "block" : "none";

    snowContainer.style.display = newDisplay;
    santaHat.style.display = newDisplay;
    hohoho.style.display = newDisplay;

    // Save preference
    localStorage.setItem("holidayMode", newDisplay === "block");
  });

  // Santa hat click animation
  if (santaHat && hohoho) {
    santaHat.addEventListener("click", () => {
      hohoho.classList.remove("active");
      void hohoho.offsetWidth; // Force reflow
      hohoho.classList.add("active");
    });
  }
});
