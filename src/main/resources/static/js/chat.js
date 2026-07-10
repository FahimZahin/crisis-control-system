const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let allContacts = [];
let conversations = [];
let selectedContact = null;
let chatRefreshInterval = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadChatData();

    chatRefreshInterval = setInterval(function () {
        if (selectedContact) {
            loadThread(false);
        }

        loadConversations(false);
    }, 5000);
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshChatBtn");
    const searchInput = document.getElementById("chatContactSearch");
    const form = document.getElementById("chatSendForm");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadChatData);
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            renderContacts();
            renderConversations();
        });
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            sendMessage();
        });
    }
}

async function loadChatData() {
    await loadConversations(true);
    await loadContacts();
}

async function loadContacts() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/chats/contacts/"
            + getLoggedInUserId()
            + "?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        allContacts = Array.isArray(result) ? result : [];
        renderContacts();

    } catch (error) {
        showMessage("Server connection failed while loading contacts.", "error-text");
    }
}

async function loadConversations(showStatusMessage) {
    try {
        const response = await fetch(
            "http://localhost:8081/api/chats/conversations/"
            + getLoggedInUserId()
            + "?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        conversations = Array.isArray(result) ? result : [];
        renderConversations();

        if (showStatusMessage) {
            showMessage("Chat loaded successfully.", "success-text");
        }

    } catch (error) {
        showMessage("Server connection failed while loading conversations.", "error-text");
    }
}

function renderContacts() {
    const list = document.getElementById("contactList");

    if (!list) {
        return;
    }

    const search = getValue("chatContactSearch").toLowerCase();

    const filtered = allContacts.filter(function (contact) {
        return [
            contact.fullName,
            contact.phoneNumber,
            contact.role,
            contact.address,
            contact.thanaOrUpazila
        ].join(" ").toLowerCase().includes(search);
    });

    if (!filtered.length) {
        list.innerHTML = `<p class="muted-text">No contact found.</p>`;
        return;
    }

    list.innerHTML = "";

    filtered.forEach(function (contact) {
        const item = createContactCard(contact);
        list.appendChild(item);
    });
}

function renderConversations() {
    const list = document.getElementById("conversationList");

    if (!list) {
        return;
    }

    const search = getValue("chatContactSearch").toLowerCase();

    const filtered = conversations.filter(function (contact) {
        return [
            contact.fullName,
            contact.phoneNumber,
            contact.role,
            contact.lastMessage
        ].join(" ").toLowerCase().includes(search);
    });

    if (!filtered.length) {
        list.innerHTML = `<p class="muted-text">No recent conversation.</p>`;
        return;
    }

    list.innerHTML = "";

    filtered.forEach(function (contact) {
        const item = createContactCard(contact);
        list.appendChild(item);
    });
}

function createContactCard(contact) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "chat-contact-card";

    if (selectedContact && Number(selectedContact.userId) === Number(contact.userId)) {
        item.classList.add("active-chat-contact");
    }

    item.innerHTML = `
        <div>
            <strong>${safeText(contact.fullName)}</strong>
            <small>${formatEnum(contact.role)} | ${safeText(contact.phoneNumber)}</small>
            <small>${safeText(contact.thanaOrUpazila)}</small>
            ${
        contact.lastMessage && contact.lastMessage !== "-"
            ? `<small class="muted-text">Last: ${safeText(contact.lastMessage)}</small>`
            : ""
    }
        </div>
        ${
        Number(contact.unreadCount || 0) > 0
            ? `<span class="chat-unread-badge">${contact.unreadCount}</span>`
            : ""
    }
    `;

    item.addEventListener("click", function () {
        selectedContact = contact;
        selectContact();
    });

    return item;
}

async function selectContact() {
    if (!selectedContact) {
        return;
    }

    setText("selectedChatName", selectedContact.fullName);
    setText("selectedChatRole", formatEnum(selectedContact.role) + " | " + safeText(selectedContact.phoneNumber));
    setText("selectedChatBadge", formatEnum(selectedContact.role));

    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendChatBtn");

    if (input) {
        input.disabled = false;
        input.focus();
    }

    if (sendBtn) {
        sendBtn.disabled = false;
    }

    renderContacts();
    renderConversations();

    await loadThread(true);
    await markThreadAsRead();
    await loadConversations(false);
}

async function loadThread(scrollBottom) {
    if (!selectedContact) {
        return;
    }

    const threadBox = document.getElementById("chatThread");

    try {
        const response = await fetch(
            "http://localhost:8081/api/chats/thread?userId="
            + encodeURIComponent(getLoggedInUserId())
            + "&otherUserId="
            + encodeURIComponent(selectedContact.userId)
            + "&time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderThread(Array.isArray(result) ? result : [], scrollBottom);

    } catch (error) {
        if (threadBox) {
            threadBox.innerHTML = `<p class="error-text">Server connection failed while loading thread.</p>`;
        }
    }
}

function renderThread(messages, scrollBottom) {
    const threadBox = document.getElementById("chatThread");

    if (!threadBox) {
        return;
    }

    if (!messages.length) {
        threadBox.innerHTML = `
            <div class="empty-dashboard-box">
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message.</p>
            </div>
        `;
        return;
    }

    threadBox.innerHTML = "";

    messages.forEach(function (message) {
        const isMine = Number(message.senderId) === Number(getLoggedInUserId());
        const bubble = document.createElement("div");

        bubble.className = isMine ? "chat-bubble mine" : "chat-bubble theirs";

        bubble.innerHTML = `
            <div class="chat-bubble-content">
                <p>${escapeHtml(message.message)}</p>
                <small>
                    ${formatDateTime(message.createdAt)}
                    ${isMine ? " | " + safeText(message.status) : ""}
                </small>
            </div>
        `;

        threadBox.appendChild(bubble);
    });

    if (scrollBottom) {
        threadBox.scrollTop = threadBox.scrollHeight;
    }
}

async function sendMessage() {
    if (!selectedContact) {
        showMessage("Please select a contact first.", "error-text");
        return;
    }

    const input = document.getElementById("chatInput");
    const message = input ? input.value.trim() : "";

    if (!message) {
        showMessage("Message cannot be empty.", "error-text");
        return;
    }

    const data = {
        senderId: Number(getLoggedInUserId()),
        receiverId: Number(selectedContact.userId),
        message: message
    };

    try {
        const response = await fetch("http://localhost:8081/api/chats/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        input.value = "";
        await loadThread(true);
        await loadConversations(false);
        showMessage("Message sent.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while sending message.", "error-text");
    }
}

async function markThreadAsRead() {
    if (!selectedContact) {
        return;
    }

    try {
        await fetch(
            "http://localhost:8081/api/chats/read?userId="
            + encodeURIComponent(getLoggedInUserId())
            + "&otherUserId="
            + encodeURIComponent(selectedContact.userId),
            {
                method: "PUT"
            }
        );
    } catch (error) {
        // Not critical for UI.
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("chatMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (char) {
            return char.toUpperCase();
        });
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function escapeHtml(value) {
    return safeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}