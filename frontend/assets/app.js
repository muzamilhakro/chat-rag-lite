const $ = (s) => document.querySelector(s);

const state = {
  document: null,
  chat: null,
  chats: [],
  documents: []
};


/* =========================
   NOTICE / LOADING
   ========================= */

function showNotice(msg) {
  const n = $("#notice");

  if (!n) return;

  n.textContent = String(msg);
  n.classList.remove("hidden");

  clearTimeout(showNotice.timer);

  showNotice.timer = setTimeout(() => {
    n.classList.add("hidden");
  }, 6500);
}


function loading(on, text = "Working…") {
  const overlay = $("#loadingOverlay");
  const loadingText = $("#loadingText");

  if (overlay) {
    overlay.classList.toggle("hidden", !on);
  }

  if (loadingText) {
    loadingText.textContent = text;
  }
}


/* =========================
   API
   ========================= */

async function api(path, opts = {}) {
  const response = await fetch(path, opts);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


/* =========================
   ESCAPE HTML
   ========================= */

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


/* =========================
   CHAT-ONLY SCROLL
   ========================= */

function scrollChatToBottom(instant = false) {
  const messages = $("#messages");

  if (!messages) return;

  if (instant) {
    messages.scrollTop = messages.scrollHeight;
    return;
  }

  messages.scrollTo({
    top: messages.scrollHeight,
    behavior: "smooth"
  });
}


function scrollMessageIntoView(element) {
  const messages = $("#messages");

  if (!messages || !element) return;

  const containerRect =
    messages.getBoundingClientRect();

  const elementRect =
    element.getBoundingClientRect();

  const target =
    messages.scrollTop +
    elementRect.top -
    containerRect.top -
    20;

  messages.scrollTo({
    top: Math.max(0, target),
    behavior: "smooth"
  });
}


/* =========================
   READY STATE
   ========================= */

function setReady() {
  const ready = !!state.document;

  const summaryBtn = $("#summaryBtn");
  const clearBtn = $("#clearBtn");
  const messageInput = $("#messageInput");
  const sendBtn = $("#sendBtn");

  if (summaryBtn) {
    summaryBtn.disabled = !ready;
  }

  if (clearBtn) {
    clearBtn.disabled = !state.chat;
  }

  if (messageInput) {
    messageInput.disabled = !ready;

    messageInput.placeholder = ready
      ? `Ask about ${state.document.filename}…`
      : "Upload a document to start…";
  }

  if (sendBtn) {
    sendBtn.disabled = !ready;
  }
}


/* =========================
   DOCUMENTS
   ========================= */

function iconFor(ext) {
  const type = String(ext || "").toLowerCase();

  if (type === "pdf") return "▤";
  if (type === "docx") return "▥";
  if (type === "pptx") return "▦";

  return "≡";
}


function renderDocs() {
  const wrap = $("#documentsList");

  if (!wrap) return;

  wrap.innerHTML = "";

  if (!state.documents.length) {
    wrap.innerHTML =
      '<div class="doc-meta" style="padding:7px">No documents yet</div>';

    return;
  }

  state.documents.forEach(d => {
    const row = document.createElement("div");

    row.className = "doc-item";

    row.innerHTML = `
      <span class="doc-icon">
        ${iconFor(d.file_type)}
      </span>

      <span
        class="doc-name"
        title="${esc(d.filename)}"
      >
        ${esc(d.filename)}
      </span>

      <button
        class="delete-doc"
        type="button"
        title="Delete"
      >×</button>
    `;

    row.querySelector(".doc-name").onclick = () => {
      selectDoc(d);
    };

    row.querySelector(".delete-doc").onclick =
      async (e) => {

        e.stopPropagation();

        try {

          await api(
            `/api/documents/${d.id}`,
            {
              method: "DELETE"
            }
          );

          if (state.document?.id === d.id) {

            state.document = null;
            state.chat = null;

            $("#chatTitle").textContent =
              "New document chat";

            $("#messages").innerHTML = "";

            $("#messages").classList.add("hidden");

            $("#emptyState").classList.remove("hidden");
          }

          await refresh();

          setReady();

        } catch (err) {
          showNotice(err.message);
        }
      };

    wrap.appendChild(row);
  });
}


/* =========================
   CHATS
   ========================= */

function renderChats() {
  const wrap = $("#chatsList");

  if (!wrap) return;

  wrap.innerHTML = "";

  if (!state.chats.length) {
    wrap.innerHTML =
      '<div class="doc-meta" style="padding:7px">No chats yet</div>';

    return;
  }

  state.chats.forEach(c => {

    const row = document.createElement("div");

    row.className =
      `chat-item ${
        state.chat?.id === c.id
          ? "active"
          : ""
      }`;

    row.innerHTML = `
      <span class="chat-icon">◌</span>

      <span
        class="chat-name"
        title="${esc(c.title)}"
      >
        ${esc(c.title)}
      </span>

      <button
        class="delete-chat"
        type="button"
        title="Delete chat"
        aria-label="Delete chat"
      >
        ×
      </button>
    `;

    /* Open chat when clicking the chat name/row */
    row.querySelector(".chat-name").onclick = () => {
      openChat(c.id);
    };

    /* Delete chat */
    row.querySelector(".delete-chat").onclick =
      async (event) => {

        event.stopPropagation();

        const confirmed = confirm(
          `Delete "${c.title}"?`
        );

        if (!confirmed) return;

        try {

          await api(
            `/api/chats/${c.id}`,
            {
              method: "DELETE"
            }
          );

          /*
             If the deleted chat is currently open,
             clear the main chat area.
          */

          if (state.chat?.id === c.id) {

            state.chat = null;
            state.document = null;

            $("#chatTitle").textContent =
              "New document chat";

            $("#messages").innerHTML = "";

            $("#messages")
              .classList
              .add("hidden");

            $("#emptyState")
              .classList
              .remove("hidden");
          }

          await refresh();

          setReady();

          showNotice(
            "Chat deleted successfully."
          );

        } catch (error) {

          console.error(
            "Delete chat error:",
            error
          );

          showNotice(
            `Could not delete chat: ${error.message}`
          );
        }
      };

    wrap.appendChild(row);
  });
}

/* =========================
   REFRESH
   ========================= */

async function refresh() {

  const [documents, chats] =
    await Promise.all([
      api("/api/documents"),
      api("/api/chats")
    ]);

  state.documents =
    documents.documents || [];

  state.chats =
    chats.chats || [];

  renderDocs();
  renderChats();
}


/* =========================
   SELECT DOCUMENT
   ========================= */

async function selectDoc(doc) {

  if (!doc) return;

  state.document = doc;
  state.chat = null;

  $("#chatTitle").textContent =
    `Chat · ${doc.filename}`;

  $("#messages").innerHTML = "";

  $("#messages").classList.add("hidden");

  $("#emptyState").classList.remove("hidden");

  try {

    const created =
      await api("/api/chats", {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          document_id: doc.id,
          title: `Chat · ${doc.filename}`
        })
      });

    state.chat = created.chat;

    renderChats();
    setReady();

  } catch (err) {

    showNotice(
      `Could not create chat: ${err.message}`
    );
  }
}


/* =========================
   OPEN CHAT
   ========================= */

async function openChat(id) {

  try {

    const res =
      await api(`/api/chats/${id}`);

    state.chat = res.chat;

    if (res.chat.document_id) {

      state.document =
        state.documents.find(
          x =>
            x.id ===
            res.chat.document_id
        ) || null;
    }

    $("#chatTitle").textContent =
      res.chat.title;

    renderMessages(
      res.chat.messages || []
    );

    renderChats();

    setReady();

  } catch (err) {

    showNotice(
      `Could not open chat: ${err.message}`
    );
  }
}


/* =========================
   RENDER MESSAGES
   ========================= */

function renderMessages(messages) {

  const wrap = $("#messages");

  if (!wrap) return;

  wrap.innerHTML = "";

  const hasMessages =
    messages.length > 0;

  $("#emptyState").classList.toggle(
    "hidden",
    hasMessages
  );

  wrap.classList.toggle(
    "hidden",
    !hasMessages
  );

  messages.forEach(message => {

    addMessageUI(
      message.role,
      message.content,
      message.sources || [],
      false
    );
  });

  if (hasMessages) {

    requestAnimationFrame(() => {
      scrollChatToBottom(true);
    });
  }
}


/* =========================
   ADD MESSAGE
   ========================= */

function addMessageUI(
  role,
  content,
  sources = [],
  animateScroll = true
) {

  const wrap = $("#messages");

  if (!wrap) return;

  const element =
    document.createElement("div");

  element.className =
    `message ${role}`;

  element.innerHTML = `
    <div>

      <div class="role">
        ${
          role === "user"
            ? "You"
            : "DocChat"
        }
      </div>

      <div class="bubble">
        ${esc(content)}
      </div>

      ${
        sources.length
          ? `
            <div class="sources">

              ${sources
                .map(
                  source => `
                    <span class="source-chip">
                      Source chunk
                      ${esc(source.chunk)}
                    </span>
                  `
                )
                .join("")}

            </div>
          `
          : ""
      }

    </div>
  `;

  wrap.appendChild(element);

  wrap.classList.remove("hidden");

  $("#emptyState").classList.add("hidden");

  if (animateScroll) {

    requestAnimationFrame(() => {
      scrollMessageIntoView(element);
    });
  }
}


/* =========================
   FILE UPLOAD
   ========================= */

async function upload(file) {

  if (!file) return;

  console.log(
    "[DocChat] Selected file:",
    file.name,
    file.type,
    file.size
  );

  loading(
    true,
    `Reading ${file.name}…`
  );

  try {

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name
    );

    console.log(
      "[DocChat] Sending /api/upload..."
    );

    const result =
      await api(
        "/api/upload",
        {
          method: "POST",
          body: formData
        }
      );

    console.log(
      "[DocChat] Upload result:",
      result
    );

    if (!result.document) {
      throw new Error(
        "Server did not return the uploaded document."
      );
    }

    state.document =
      result.document;

    await refresh();

    await selectDoc(
      result.document
    );

    showNotice(
      `Uploaded ${result.document.filename} successfully.`
    );

  } catch (error) {

    console.error(
      "[DocChat] Upload error:",
      error
    );

    showNotice(
      `Upload failed: ${error.message}`
    );

  } finally {

    loading(false);
  }
}


/* =========================
   FILE INPUT
   ========================= */

function setupFileUpload() {

  const fileInput =
    $("#fileInput");

  if (!fileInput) {

    console.error(
      "[DocChat] #fileInput not found."
    );

    return;
  }

  /*
    IMPORTANT:
    The HTML <label> already opens
    the file picker.

    We DO NOT call fileInput.click()
    here.
  */

  fileInput.addEventListener(
    "change",
    async (event) => {

      const file =
        event.target.files &&
        event.target.files[0];

      if (!file) return;

      console.log(
        "[DocChat] File selected:",
        file.name
      );

      await upload(file);

      /*
        Reset the input so the same
        file can be selected again.
      */

      event.target.value = "";
    }
  );
}


/* =========================
   NEW CHAT
   ========================= */

$("#newChatBtn").onclick = () => {

  state.document = null;
  state.chat = null;

  $("#chatTitle").textContent =
    "New document chat";

  $("#messages").innerHTML = "";

  $("#messages").classList.add("hidden");

  $("#emptyState").classList.remove("hidden");

  setReady();

  renderChats();
};


/* =========================
   SUMMARY
   ========================= */

$("#summaryBtn").onclick =
  async () => {

    if (!state.document) return;

    loading(
      true,
      "Generating summary…"
    );

    try {

      const result =
        await api(
          `/api/documents/${state.document.id}/summarize`,
          {
            method: "POST"
          }
        );

      const card =
        document.createElement("div");

      card.className =
        "summary-card";

      card.innerHTML = `
        <h3>Document summary</h3>
        <p>
          ${esc(result.summary)}
        </p>
      `;

      $("#messages").innerHTML = "";

      $("#messages")
        .classList
        .remove("hidden");

      $("#emptyState")
        .classList
        .add("hidden");

      $("#messages")
        .appendChild(card);

      requestAnimationFrame(() => {
        scrollChatToBottom(false);
      });

    } catch (error) {

      showNotice(
        `Summary failed: ${error.message}`
      );

    } finally {

      loading(false);
    }
  };


/* =========================
   CLEAR CHAT
   ========================= */

$("#clearBtn").onclick =
  async () => {

    if (!state.chat) return;

    try {

      await api(
        `/api/chats/${state.chat.id}/clear`,
        {
          method: "POST"
        }
      );

      renderMessages([]);

    } catch (error) {

      showNotice(
        `Could not clear chat: ${error.message}`
      );
    }
  };


/* =========================
   SEND MESSAGE
   ========================= */

$("#composer").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const question =
      $("#messageInput")
        .value
        .trim();

    if (
      !question ||
      !state.chat
    ) {
      return;
    }

    addMessageUI(
      "user",
      question,
      [],
      true
    );

    $("#messageInput").value = "";

    loading(
      true,
      "Searching document…"
    );

    try {

      const result =
        await api(
          `/api/chats/${state.chat.id}/messages`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: question
            })
          }
        );

      addMessageUI(
        "assistant",
        result.answer,
        result.sources || [],
        true
      );

      await refresh();

    } catch (error) {

      showNotice(
        `Message failed: ${error.message}`
      );

    } finally {

      loading(false);

      $("#messageInput").focus();
    }
  }
);


/* =========================
   ENTER TO SEND
   ========================= */

$("#messageInput").addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      $("#composer").requestSubmit();
    }
  }
);


/* =========================
   QUICK PROMPTS
   ========================= */

document
  .querySelectorAll("[data-prompt]")
  .forEach(button => {

    button.onclick = () => {

      if (!state.document) {

        showNotice(
          "Upload a document first."
        );

        return;
      }

      $("#messageInput").value =
        button.dataset.prompt;

      $("#messageInput").focus();
    };
  });


/* =========================
   START APPLICATION
   ========================= */

setupFileUpload();

refresh()
  .catch(error => {

    console.error(
      "[DocChat] Initial load error:",
      error
    );

    showNotice(
      `Could not load data: ${error.message}`
    );
  });

setReady();
