import { loginWithGoogle, logoutUser, initAuthListener } from './auth.js';
import { submitScore, getLeaderboard, getPersonalBest } from './firestore.js';
import { requestNotificationPermission, onForegroundMessage, triggerLocalHighScoreNotification } from './messaging.js';

let currentUser = null;

export const initGameFirebase = () => {
    // 1. Auth Listener
    initAuthListener((user) => {
        if (user) {
            currentUser = user;
            console.log("Logged in as:", user.displayName);
            const statusEl = document.getElementById("login-status");
            if (statusEl) statusEl.innerText = `Welcome, ${user.displayName}`;
            
            // Ask for notification permission after login
            requestNotificationPermission(user.uid);
            
            // Fetch personal best
            updatePersonalBestUI();
        } else {
            currentUser = null;
            const statusEl = document.getElementById("login-status");
            if (statusEl) statusEl.innerText = "Not logged in.";
        }
    });

    // 2. Initial render of leaderboard
    renderLeaderboardUI();
    
    // 3. Foreground Messages Event Listener
    onForegroundMessage((payload) => {
        console.log("Message received in foreground:", payload);
        alert(`${payload.notification.title}: ${payload.notification.body}`);
    });
};

export const handleGameOver = async (finalScore) => {
    if (!currentUser) {
        console.warn("User not logged in. Cannot save score.");
        // Uncomment if you want to force login: alert("Login to save your scores!");
        return;
    }
    
    try {
        const result = await submitScore(currentUser.uid, {
            score: finalScore,
            difficulty: "easy",
            time: 120
        });
        
        if (result.isNewHighScore) {
            triggerLocalHighScoreNotification();
            updatePersonalBestUI();
        }
        
        // refresh leaderboard
        renderLeaderboardUI();
    } catch(e) {
        console.error("Failed to process game over score", e);
    }
};

const updatePersonalBestUI = async () => {
    if (!currentUser) return;
    const best = await getPersonalBest(currentUser.uid);
    const pbElement = document.getElementById("personal-best");
    if (pbElement) pbElement.innerText = best;
};

const renderLeaderboardUI = async () => {
    const scores = await getLeaderboard();
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    
    list.innerHTML = "";
    scores.forEach((s, index) => {
        const li = document.createElement("li");
        li.innerText = `#${index + 1} - User ${s.uid.substring(0,5)}... : ${s.score}`;
        list.appendChild(li);
    });
};

// Basic HTML Bindings:
// document.getElementById('login-btn')?.addEventListener('click', loginWithGoogle);
// document.getElementById('logout-btn')?.addEventListener('click', logoutUser);
// document.getElementById('trigger-game-over-btn')?.addEventListener('click', () => handleGameOver(100));

// Call initialization
// initGameFirebase();
