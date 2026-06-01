const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadSuggestedQuestions();
});

function setupEvents() {
    const form = document.getElementById("assistantAskForm");
    const clearBtn = document.getElementById("clearAssistantChatBtn");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            askAssistantFromInput();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", resetAssistantThread);
    }
}

async function loadSuggestedQuestions() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/crisis-assistant/suggested-questions?time=" + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            return;
        }

        renderSuggestedQuestions(result.questions || []);

    } catch (error) {
        // Suggested questions already have default HTML fallback.
    }
}

function renderSuggestedQuestions(questions) {
    const box = document.getElementById("assistantSuggestedQuestions");

    if (!box || !questions.length) {
        return;
    }

    box.innerHTML = "";

    questions.forEach(function (question) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "assistant-question-chip";
        button.innerText = question;

        button.addEventListener("click", function () {
            askAssistant(question);
        });

        box.appendChild(button);
    });
}

function askAssistantFromInput() {
    const input = document.getElementById("assistantQuestionInput");
    const question = input ? input.value.trim() : "";

    if (!question) {
        showStatus("Please type a question.", "error-text");
        return;
    }

    askAssistant(question);

    if (input) {
        input.value = "";
    }
}

async function askAssistant(question) {
    appendUserMessage(question);
    appendTypingMessage();

    const data = {
        userId: Number(getLoggedInUserId()),
        question: question
    };

    try {
        const response = await fetch("http://localhost:8081/api/crisis-assistant/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        removeTypingMessage();

        if (!response.ok) {
            appendBotMessage(getErrorMessage(result));
            showStatus(getErrorMessage(result), "error-text");
            return;
        }

        appendBotMessage(result.answer, result.intent, result.userArea);
        showStatus("Answer generated from system database.", "success-text");

    } catch (error) {
        removeTypingMessage();
        appendBotMessage("Server connection failed while asking the assistant.");
        showStatus("Server connection failed.", "error-text");
    }
}

function appendUserMessage(message) {
    const thread = document.getElementById("assistantChatThread");

    if (!thread) {
        return;
    }

    const card = document.createElement("div");
    card.className = "assistant-message assistant-user-message";

    card.innerHTML = `
        <strong>You</strong>
        <p>${escapeHtml(message)}</p>
    `;

    thread.appendChild(card);
    scrollAssistantBottom();
}

function appendBotMessage(message, intent, userArea) {
    const thread = document.getElementById("assistantChatThread");

    if (!thread) {
        return;
    }

    const card = document.createElement("div");
    card.className = "assistant-message assistant-bot-message";

    card.innerHTML = `
        <strong>AI Crisis Assistant</strong>
        ${intent ? `<small>Intent: ${escapeHtml(formatEnum(intent))} | Area: ${escapeHtml(userArea || "-")}</small>` : ""}
        <p>${formatAssistantAnswer(message)}</p>
    `;

    thread.appendChild(card);
    scrollAssistantBottom();
}

function appendTypingMessage() {
    const thread = document.getElementById("assistantChatThread");

    if (!thread) {
        return;
    }

    const card = document.createElement("div");
    card.id = "assistantTypingMessage";
    card.className = "assistant-message assistant-bot-message";

    card.innerHTML = `
        <strong>AI Crisis Assistant</strong>
        <p>Analyzing system data...</p>
    `;

    thread.appendChild(card);
    scrollAssistantBottom();
}

function removeTypingMessage() {
    const typing = document.getElementById("assistantTypingMessage");

    if (typing) {
        typing.remove();
    }
}

function resetAssistantThread() {
    const thread = document.getElementById("assistantChatThread");

    if (!thread) {
        return;
    }

    thread.innerHTML = `
        <div class="assistant-message assistant-bot-message">
            <strong>AI Crisis Assistant</strong>
            <p>Hello! Ask me about nearby fuel, open pumps, local outage notices, fuel request status, or route token status.</p>
        </div>
    `;

    showStatus("", "");
}

function scrollAssistantBottom() {
    const thread = document.getElementById("assistantChatThread");

    if (thread) {
        thread.scrollTop = thread.scrollHeight;
    }
}

function formatAssistantAnswer(value) {
    return escapeHtml(value).replaceAll("\n", "<br>");
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

function showStatus(message, className) {
    const element = document.getElementById("assistantStatusMessage");

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
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
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