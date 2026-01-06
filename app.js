/* =========================================
   CONSTANTS & CONFIG
   ========================================= */
const DAYS_PLAN = [
    { name: "Repos / Batch Cooking", type: "rest" }, // Dimanche (0)
    { // Lundi (1)
        name: "Dos & Biceps",
        type: "muscle",
        exos: ["Tractions (Lestées)", "Tirage Vertical", "Tirage Machine", "Curl Debout", "Curl Incliné", "Curl Poulie"]
    },
    { // Mardi (2)
        name: "Natation HIIT",
        type: "swim_hiit",
        details: [
            "Échauffement: 200m crawl",
            "Technique: 6x25m (récup 20s)",
            "Série: 10x50m sprint (récup 30s)",
            "Calme: 100m souple"
        ]
    },
    { // Mercredi (3)
        name: "Jambes & Épaules",
        type: "muscle",
        exos: ["Presse à cuisses", "Leg Extension", "Leg Curl", "Développé Épaules", "Élévations Latérales"]
    },
    { // Jeudi (4)
        name: "Pecs & Triceps",
        type: "muscle",
        exos: ["Smith Incliné", "Écarté Haut", "Écarté Bas", "Triceps Poulie", "Extension Overhead", "Rappel Élévations"]
    },
    { // Vendredi (5)
        name: "Full Body Rappel",
        type: "muscle",
        exos: ["Tractions", "Presse (Léger)", "Smith Incliné", "Super-set Bras", "Élévations Latérales"]
    },
    { // Samedi (6)
        name: "Natation Endurance",
        type: "swim_endurance",
        details: [
            "Échauffement: 300m facile",
            "Pyramide: 200-400-600-400-200m",
            "Finisher: 6x25m sprint",
            "Calme: 100m"
        ]
    }
];

const QUOTES = [
    "La douleur est temporaire, l'abandon est définitif.",
    "Sois plus fort que tes excuses.",
    "Chaque rep compte.",
    "Discipline > Motivation.",
    "Light weight baby!",
    "Tout est dans la tête."
];

// State Global
let state = {
    workouts: [], // {id, date, exo, kg, reps, note}
    swims: [],    // {id, date, type, style, dist, time, pace, rpe}
    weights: [],  // {date, kg}
    settings: {
        timerDefault: 90,
        notifications: false,
        goalText: "76 kg sec"
    }
};

let timerInterval;
let timerSeconds = 0;
let chartInstance = null;
let currentSessionGoal = ""; // Variable pour stocker l'objectif de la séance en cours

/* =========================================
   INIT & STORAGE
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initRouter();
    renderDashboard();
    setupNotifications();
});

function loadData() {
    const s = localStorage.getItem('chad_tracker_v3');
    if (s) {
        state = JSON.parse(s);
        if(!state.settings) state.settings = { timerDefault: 90, notifications: false, goalText: "" };
    }
}

function saveData() {
    localStorage.setItem('chad_tracker_v3', JSON.stringify(state));
    renderDashboard();
}

/* =========================================
   ROUTER & NAVIGATION
   ========================================= */
function router(viewName) {
    // Hide all views
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    
    // Show selected
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    // Reset session goal if leaving workout
    if (viewName !== 'workout') currentSessionGoal = "";

    // Logic specific to view
    if (viewName === 'workout') renderWorkoutView();
    if (viewName === 'stats') renderStats();
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'settings') renderSettings();
    if (viewName === 'home') renderDashboard();

    // Nav active state
    document.querySelectorAll('.nav-item span').forEach(el => el.classList.remove('text-primary', 'text-white'));
}

function initRouter() {
    router('home');
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = new Date().toLocaleDateString('fr-FR', options);
    document.getElementById('header-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

/* =========================================
   DASHBOARD
   ========================================= */
function renderDashboard() {
    // Quote
    const qIndex = new Date().getDate() % QUOTES.length;
    document.getElementById('quote-text').innerText = `"${QUOTES[qIndex]}"`;

    // Today's Plan
    const dayIndex = new Date().getDay();
    const plan = DAYS_PLAN[dayIndex];
    document.getElementById('today-workout-name').innerText = plan.name;
    document.getElementById('today-icon').innerText = plan.type.includes('swim') ? '🏊‍♂️' : (plan.type === 'rest' ? '💤' : '🏋️');

    // Stats Rapides
    const lastWeight = state.weights.length > 0 ? state.weights[state.weights.length - 1].kg : '--';
    document.getElementById('dash-weight').innerText = lastWeight;

    document.getElementById('dash-goal').innerText = state.settings.goalText || "Définir objectif";

    // Calculs Hebdo
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day == 0 ? -6 : 1); 
    const monday = new Date(now.setDate(diff));
    monday.setHours(0,0,0,0);

    const weekLogs = state.workouts.filter(w => new Date(w.date) >= monday);
    const vol = weekLogs.reduce((acc, curr) => acc + (curr.kg * curr.reps), 0);
    document.getElementById('dash-vol').innerText = (vol / 1000).toFixed(1) + 'k';

    const swimLogs = state.swims.filter(s => new Date(s.date) >= monday);
    const swimDist = swimLogs.reduce((acc, curr) => acc + curr.dist, 0);
    document.getElementById('dash-swim').innerText = swimDist + ' m';

    // Streak (Updated Logic)
    document.getElementById('dash-streak').innerText = calculateStreak() + 'j';

    // Suggestion
    if(plan.exos && plan.exos.length > 0) {
        const lastLog = state.workouts.filter(w => w.exo === plan.exos[0]).pop();
        if(lastLog) {
            document.getElementById('suggestion-box').classList.remove('hidden');
            document.getElementById('suggestion-text').innerText = `Dernier ${plan.exos[0]} : ${lastLog.kg}kg x ${lastLog.reps}. Vise +1 rep !`;
        }
    }
}

function editGoal() {
    const newGoal = prompt("Nouvel objectif :", state.settings.goalText);
    if(newGoal) {
        state.settings.goalText = newGoal;
        saveData();
    }
}

// --- FIX: CALCULATE STREAK (Jours consécutifs) ---
function calculateStreak() {
    const dates = [
        ...state.workouts.map(w => w.date.split('T')[0]),
        ...state.swims.map(s => s.date.split('T')[0])
    ].sort((a, b) => new Date(b) - new Date(a)); // Plus récent d'abord

    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // Si pas de sport aujourd'hui ni hier, streak brisé
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let streak = 1;
    let currentDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i]);
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
        } else {
            break;
        }
    }
    return streak;
}

/* =========================================
   WORKOUT LOGIC
   ========================================= */
function renderWorkoutView() {
    const container = document.getElementById('workout-container');
    container.innerHTML = '';
    
    const dayIndex = new Date().getDay();
    const plan = DAYS_PLAN[dayIndex];
    document.getElementById('workout-title').innerText = plan.name;

    if (plan.type === 'rest') {
        container.innerHTML = `<div class="text-center py-10 text-gray-400">Repos aujourd'hui. Profite pour faire du meal prep. 🥦</div>`;
        return;
    }

    // --- UPGRADE: Demande Objectif Séance (Si pas encore défini) ---
    if (!plan.type.includes('swim') && !currentSessionGoal) {
        const choice = prompt("🎯 Objectif de la séance ?\n\n1. +1 Rep (Surcharge progressive)\n2. +2.5 kg (Force)\n3. Maintenir (Fatigue/Deload)\n\n(Tape 1, 2 ou 3)");
        if (choice === '1') currentSessionGoal = "+1 Rep";
        else if (choice === '2') currentSessionGoal = "+2.5 kg";
        else currentSessionGoal = "Maintien";
    }

    if (plan.type.includes('swim')) {
        renderSwimInterface(plan, container);
    } else {
        renderMuscleInterface(plan, container);
    }
}

// --- MUSCULATION (Updated with Goal Logic) ---
function renderMuscleInterface(plan, container) {
    
    // Affichage du bandeau Objectif
    const goalBanner = document.createElement('div');
    goalBanner.className = "mb-4 bg-primary/10 border border-primary/50 text-primary px-4 py-3 rounded-xl text-center font-bold uppercase text-sm shadow-sm";
    goalBanner.innerHTML = `🔥 Objectif : <span class="text-white">${currentSessionGoal || 'EXPLOSER TOUT'}</span>`;
    container.appendChild(goalBanner);

    plan.exos.forEach((exo, idx) => {
        // Find last set for history
        const history = state.workouts.filter(w => w.exo === exo).slice(-5).reverse();
        const lastSet = history[0];

        // --- INTELLIGENT FILLING ---
        let targetText = "Nouveau";
        let defaultKg = "";
        let defaultReps = "";

        if (lastSet) {
            defaultKg = lastSet.kg;
            defaultReps = lastSet.reps;

            if (currentSessionGoal === "+1 Rep") {
                targetText = `Cible : ${lastSet.kg}kg x ${Number(lastSet.reps) + 1}`;
                defaultReps = Number(lastSet.reps) + 1;
            } else if (currentSessionGoal === "+2.5 kg") {
                targetText = `Cible : ${Number(lastSet.kg) + 2.5}kg x ${lastSet.reps}`;
                defaultKg = Number(lastSet.kg) + 2.5;
            } else {
                targetText = `Maintien : ${lastSet.kg}kg x ${lastSet.reps}`;
            }
        }

        const card = document.createElement('div');
        card.className = "glass p-4 rounded-2xl border border-gray-800";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <h3 class="font-bold text-white text-lg">${exo}</h3>
                <button onclick="showHistory('${exo}')" class="text-primary text-xs">Historique</button>
            </div>
            
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] text-gray-500 bg-surface px-2 py-1 rounded border border-gray-700">Dernier: ${lastSet ? lastSet.kg + 'kg x ' + lastSet.reps : '-'}</span>
                <span class="text-xs text-accent font-mono font-bold">${targetText}</span>
            </div>

            <div class="flex items-center gap-2 mb-2">
                <button class="bg-gray-700 w-8 h-8 rounded text-white active:bg-gray-600" onclick="adjustInput('kg-${idx}', -2.5)">-</button>
                <div class="flex-1 relative">
                    <input type="number" id="kg-${idx}" placeholder="kg" class="w-full bg-bg border border-gray-600 rounded-lg p-3 text-center text-white font-bold text-lg focus:border-primary outline-none" value="${defaultKg}">
                    <span class="absolute right-2 top-3 text-xs text-gray-500">KG</span>
                </div>
                <button class="bg-gray-700 w-8 h-8 rounded text-white active:bg-gray-600" onclick="adjustInput('kg-${idx}', 2.5)">+</button>
            </div>

            <div class="flex items-center gap-2 mb-4">
                <button class="bg-gray-700 w-8 h-8 rounded text-white active:bg-gray-600" onclick="adjustInput('reps-${idx}', -1)">-</button>
                <div class="flex-1 relative">
                    <input type="number" id="reps-${idx}" placeholder="Reps" class="w-full bg-bg border border-gray-600 rounded-lg p-3 text-center text-white font-bold text-lg focus:border-primary outline-none" value="${defaultReps}">
                    <span class="absolute right-2 top-3 text-xs text-gray-500">REPS</span>
                </div>
                <button class="bg-gray-700 w-8 h-8 rounded text-white active:bg-gray-600" onclick="adjustInput('reps-${idx}', 1)">+</button>
            </div>

            <button onclick="logSet('${exo}', 'kg-${idx}', 'reps-${idx}')" class="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/40 active:scale-95 transition-transform">
                VALIDER SET
            </button>
        `;
        container.appendChild(card);
    });
}

function adjustInput(id, delta) {
    const input = document.getElementById(id);
    let val = parseFloat(input.value) || 0;
    val += delta;
    if(val < 0) val = 0;
    input.value = Number.isInteger(val) ? val : val.toFixed(1);
}

function logSet(exo, kgId, repsId) {
    const kg = parseFloat(document.getElementById(kgId).value);
    const reps = parseFloat(document.getElementById(repsId).value);

    if (!kg || !reps) return showToast("Valeurs manquantes", true);

    state.workouts.push({
        id: Date.now(),
        date: new Date().toISOString(),
        exo: exo,
        kg: kg,
        reps: reps
    });
    saveData();
    showToast(`Set validé: ${kg}kg x ${reps}`);
    openTimer();
    renderDashboard(); 
}

function showHistory(exo) {
    const logs = state.workouts.filter(w => w.exo === exo).slice(-10).reverse();
    let msg = `Historique ${exo}:\n\n`;
    logs.forEach(l => {
        const d = new Date(l.date).toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
        msg += `${d} : ${l.kg}kg x ${l.reps}\n`;
    });
    alert(msg);
}

// --- NATATION ---
function renderSwimInterface(plan, container) {
    const info = document.createElement('div');
    info.className = "bg-surface p-4 rounded-xl mb-6 border-l-4 border-accent";
    info.innerHTML = `<h4 class="font-bold text-white mb-2">Programme du jour :</h4><ul class="text-sm text-gray-300 list-disc pl-4 space-y-1">${plan.details.map(d=>`<li>${d}</li>`).join('')}</ul>`;
    container.appendChild(info);

    const form = document.createElement('div');
    form.className = "glass p-4 rounded-2xl";
    form.innerHTML = `
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label class="text-xs text-gray-400">Nage</label>
                <select id="swim-style" class="w-full bg-bg border border-gray-700 rounded-lg p-3 text-white">
                    <option>Crawl</option>
                    <option>Brasse</option>
                    <option>Dos</option>
                    <option>Papillon</option>
                    <option>Mixte</option>
                </select>
            </div>
            <div>
                <label class="text-xs text-gray-400">Distance (m)</label>
                <input type="number" id="swim-dist" class="w-full bg-bg border border-gray-700 rounded-lg p-3 text-white" placeholder="Ex: 2000">
            </div>
        </div>
        <div class="mb-4">
            <label class="text-xs text-gray-400">Temps Total (MM:SS)</label>
            <div class="flex gap-2">
                <input type="number" id="swim-mm" placeholder="MM" class="bg-bg border border-gray-700 rounded-lg p-3 text-white w-1/2 text-center">
                <input type="number" id="swim-ss" placeholder="SS" class="bg-bg border border-gray-700 rounded-lg p-3 text-white w-1/2 text-center">
            </div>
        </div>
        <button onclick="logSwim('${plan.type}')" class="w-full bg-accent hover:bg-emerald-600 text-black font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
            VALIDER SÉANCE
        </button>
    `;
    container.appendChild(form);
}

function logSwim(type) {
    const dist = parseInt(document.getElementById('swim-dist').value);
    const mm = parseInt(document.getElementById('swim-mm').value) || 0;
    const ss = parseInt(document.getElementById('swim-ss').value) || 0;
    const style = document.getElementById('swim-style').value;

    if (!dist || (mm === 0 && ss === 0)) return showToast("Données incomplètes", true);

    const totalSeconds = (mm * 60) + ss;
    const pace = (totalSeconds / dist) * 100;

    state.swims.push({
        id: Date.now(),
        date: new Date().toISOString(),
        type: type,
        style: style,
        dist: dist,
        time: totalSeconds,
        pace: pace
    });
    saveData();
    showToast(`Natation validée! Allure: ${formatTime(pace)}/100m`);
    router('home');
}

/* =========================================
   TIMER SYSTEM
   ========================================= */
function openTimer() {
    const modal = document.getElementById('timer-modal');
    modal.classList.remove('translate-y-full');
    
    timerSeconds = parseInt(state.settings.timerDefault);
    updateTimerDisplay();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            navigator.vibrate([200, 100, 200]);
        }
    }, 1000);
}

function closeTimer() {
    document.getElementById('timer-modal').classList.add('translate-y-full');
    document.getElementById('workout-timer-display').classList.remove('hidden');
}

function adjustTimer(sec) {
    timerSeconds += sec;
    if (timerSeconds < 0) timerSeconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const txt = formatTime(timerSeconds);
    document.getElementById('timer-countdown').innerText = txt;
    document.getElementById('workout-timer-display').innerText = txt;
    if(timerSeconds <= 0) document.getElementById('workout-timer-display').classList.add('hidden');
}

function formatTime(totalSec) {
    if(!totalSec || isNaN(totalSec)) return "00:00";
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

/* =========================================
   STATS & CHARTS
   ========================================= */
function renderStats() {
    const select = document.getElementById('stats-exo-select');
    select.innerHTML = "";
    
    // --- FIX: Populate dropdown with Plan AND History ---
    let allExos = new Set();
    
    // Add plan exos
    DAYS_PLAN.forEach(day => {
        if(day.exos) day.exos.forEach(e => allExos.add(e));
    });
    // Add history exos
    state.workouts.forEach(w => allExos.add(w.exo));
    
    // Sort and render
    [...allExos].sort().forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.innerText = ex;
        select.appendChild(opt);
    });

    switchStatTab('weight');
}

function switchStatTab(tab) {
    document.querySelectorAll('.stat-tab-btn').forEach(b => {
        b.classList.remove('bg-primary', 'text-white', 'border-transparent');
        b.classList.add('bg-surface', 'border-gray-700');
    });
    
    // Note: Simple logic implies re-render, adding 'active' class would be better but keeping simple
    
    document.querySelectorAll('.stat-control').forEach(el => el.classList.add('hidden'));
    document.getElementById(`stats-${tab}-controls`).classList.remove('hidden');

    const ctx = document.getElementById('mainChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    if (tab === 'weight') {
        const data = state.weights.slice(-30);
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: 'Poids (kg)',
                    data: data.map(d => d.kg),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: chartOptions()
        });
    } else if (tab === 'muscle') {
        updateMuscleStats();
    } else if (tab === 'swim') {
        const data = state.swims.slice(-10);
        const recentSwims = state.swims.filter(s => (new Date() - new Date(s.date)) < (30*24*60*60*1000));
        let best = recentSwims.reduce((min, p) => p.pace < min ? p.pace : min, 9999);
        document.getElementById('best-swim-pace').innerText = best === 9999 ? "--:--" : formatTime(best) + "/100m";

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString().slice(0,5)),
                datasets: [{
                    label: 'Distance (m)',
                    data: data.map(d => d.dist),
                    backgroundColor: '#10b981',
                }]
            },
            options: chartOptions()
        });
    }
}

function updateMuscleStats() {
    const exo = document.getElementById('stats-exo-select').value;
    if(!exo) return;
    
    const logs = state.workouts.filter(w => w.exo === exo).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const maxWeight = Math.max(...logs.map(l => l.kg));
    const maxVol = Math.max(...logs.map(l => l.kg * l.reps));
    const maxReps = Math.max(...logs.map(l => l.reps));

    document.getElementById('pr-weight').innerText = isFinite(maxWeight) ? maxWeight + 'kg' : '-';
    document.getElementById('pr-volume').innerText = isFinite(maxVol) ? maxVol : '-';
    document.getElementById('pr-reps').innerText = isFinite(maxReps) ? maxReps : '-';

    const sessionMap = new Map();
    logs.forEach(l => {
        const d = l.date.split('T')[0];
        if(!sessionMap.has(d) || sessionMap.get(d) < l.kg) {
            sessionMap.set(d, l.kg);
        }
    });
    
    const labels = Array.from(sessionMap.keys()).slice(-10);
    const data = Array.from(sessionMap.values()).slice(-10);

    const ctx = document.getElementById('mainChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => l.substring(5)),
            datasets: [{
                label: `Max Kg (${exo})`,
                data: data,
                borderColor: '#f59e0b',
                tension: 0.1
            }]
        },
        options: chartOptions()
    });
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
            y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
        }
    };
}

function logWeight() {
    const val = parseFloat(document.getElementById('new-weight').value);
    if(val) {
        state.weights.push({ date: new Date().toISOString(), kg: val });
        saveData();
        showToast("Poids enregistré");
        switchStatTab('weight');
    }
}

/* =========================================
   CALENDAR
   ========================================= */
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    while(grid.children.length > 7) { grid.removeChild(grid.lastChild); }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for(let i=0; i<startOffset; i++) {
        const div = document.createElement('div');
        grid.appendChild(div);
    }

    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        
        const hasMuscle = state.workouts.some(w => w.date.startsWith(dateStr));
        const hasSwim = state.swims.some(s => s.date.startsWith(dateStr));

        const cell = document.createElement('div');
        cell.className = "h-10 flex flex-col items-center justify-center rounded-lg border border-gray-800 relative " + 
                         (dateStr === now.toISOString().split('T')[0] ? "bg-gray-800" : "");
        
        cell.innerHTML = `<span class="text-xs text-gray-300">${d}</span>`;
        
        if(hasMuscle || hasSwim) {
            const dot = document.createElement('div');
            dot.className = `w-2 h-2 rounded-full mt-1 ${hasSwim ? 'bg-accent' : 'bg-primary'}`;
            cell.appendChild(dot);
        }

        grid.appendChild(cell);
    }
}

/* =========================================
   SETTINGS & DATA
   ========================================= */
function renderSettings() {
    document.getElementById('setting-timer').value = state.settings.timerDefault;
    document.getElementById('setting-notif').checked = state.settings.notifications;
    
    document.getElementById('setting-timer').onchange = (e) => {
        state.settings.timerDefault = parseInt(e.target.value);
        saveData();
    };
    
    document.getElementById('setting-notif').onchange = (e) => {
        state.settings.notifications = e.target.checked;
        saveData();
        if(state.settings.notifications) RequestNotifyPermission();
    };
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "chad_tracker_backup.json");
    dlAnchorElem.click();
}

function importData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            state = json;
            saveData();
            showToast("Import réussi !");
            setTimeout(() => location.reload(), 1000);
        } catch(err) {
            alert("Erreur fichier JSON invalide");
        }
    };
    reader.readAsText(file);
}

function resetApp() {
    if(confirm("Tu es sûr de vouloir tout effacer ? C'est irréversible.")) {
        localStorage.removeItem('chad_tracker_v3');
        location.reload();
    }
}

/* =========================================
   HELPERS
   ========================================= */
function showToast(msg, error=false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl font-bold text-sm transition-all z-[70] ${error ? 'bg-red-500 text-white' : 'bg-accent text-black'}`;
    t.style.opacity = '1';
    t.style.top = '20px';
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.top = '0px';
    }, 2500);
}

function setupNotifications() {
    // Placeholder
}

function RequestNotifyPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}