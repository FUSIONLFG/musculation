/* =========================================
   CONSTANTS & CONFIG
   ========================================= */
const DAYS_PLAN = [
    { name: "Repos / Batch Cooking", type: "rest", short: "Repos" }, // Dimanche (0)
    { // Lundi (1)
        name: "Dos & Biceps",
        type: "muscle",
        short: "Dos/Bi",
        exos: ["Tractions (Lestées)", "Tirage Vertical", "Tirage Machine", "Curl Debout", "Curl Incliné", "Curl Poulie"]
    },
    { // Mardi (2)
        name: "Natation HIIT",
        type: "swim_hiit",
        short: "Nage HIIT",
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
        short: "Jambes/Ép",
        exos: ["Presse à cuisses", "Leg Extension", "Leg Curl", "Développé Épaules", "Élévations Latérales"]
    },
    { // Jeudi (4)
        name: "Pecs & Triceps",
        type: "muscle",
        short: "Pecs/Tri",
        exos: ["Smith Incliné", "Écarté Haut", "Écarté Bas", "Triceps Poulie", "Extension Overhead", "Rappel Élévations"]
    },
    { // Vendredi (5)
        name: "Full Body Rappel",
        type: "muscle",
        short: "Full Body",
        exos: ["Tractions", "Presse (Léger)", "Smith Incliné", "Super-set Bras", "Élévations Latérales"]
    },
    { // Samedi (6)
        name: "Natation Endurance",
        type: "swim_endurance",
        short: "Nage Endu",
        details: [
            "Échauffement: 300m facile",
            "Pyramide: 200-400-600-400-200m",
            "Finisher: 6x25m sprint",
            "Calme: 100m"
        ]
    }
];

const DIET_PLAN = [
    { time: "07:30", label: "Petit Déjeuner", desc: "Oeufs, Avoine, Fruit, Café" },
    { time: "10:30", label: "Collation Matin", desc: "Fruit, Amandes, Shaker" },
    { time: "12:30", label: "Déjeuner", desc: "Poulet/Poisson, Glucides, Légumes" },
    { time: "17:00", label: "Collation Aprems", desc: "Whey, Fruit, Hydratation" },
    { time: "20:00", label: "Dîner (Post-Workout)", desc: "Protéine maigre, Glucides, Légumes" }
];

const QUOTES = [
    "La douleur est temporaire, l'abandon est définitif.",
    "Sois plus fort que tes excuses.",
    "Chaque rep compte.",
    "Discipline > Motivation.",
    "Light weight baby!",
    "Tout est dans la tête."
];

let state = {
    workouts: [], 
    swims: [],    
    weights: [],  
    nutrition: {
        water: 0,
        lastReset: null
    },
    settings: {
        timerDefault: 90,
        notifications: false,
        goalText: "76 kg sec"
    }
};

let timerInterval;
let timerSeconds = 0;
let chartInstance = null;
let currentSessionGoal = ""; 

/* =========================================
   INIT
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkDailyReset();
    initRouter();
    renderDashboard();
});

function loadData() {
    const s = localStorage.getItem('chad_tracker_v3');
    if (s) {
        state = JSON.parse(s);
        if(!state.nutrition) state.nutrition = { water: 0, lastReset: new Date().toDateString() };
        if(!state.settings) state.settings = { timerDefault: 90, notifications: false, goalText: "" };
    }
}

function saveData() {
    localStorage.setItem('chad_tracker_v3', JSON.stringify(state));
    renderDashboard();
}

function checkDailyReset() {
    const today = new Date().toDateString();
    if (state.nutrition.lastReset !== today) {
        state.nutrition.water = 0;
        state.nutrition.lastReset = today;
        saveData();
    }
}

/* =========================================
   ROUTER (CORRIGÉ POUR LE BUG MODALE)
   ========================================= */
function router(viewName) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    
    // --- FIX : Forcer la fermeture de la modale Objectif ---
    const modal = document.getElementById('goal-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.add('opacity-0'); // Reset animation
    }
    // -------------------------------------------------------

    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    if (viewName !== 'workout') currentSessionGoal = "";

    if (viewName === 'workout') renderWorkoutView();
    if (viewName === 'stats') renderStats();
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'settings') renderSettings();
    if (viewName === 'nutrition') renderNutrition();
    if (viewName === 'home') renderDashboard();

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
    const qIndex = new Date().getDate() % QUOTES.length;
    document.getElementById('quote-text').innerText = `"${QUOTES[qIndex]}"`;

    const dayIndex = new Date().getDay();
    const plan = DAYS_PLAN[dayIndex];
    document.getElementById('today-workout-name').innerText = plan.name;
    document.getElementById('today-icon').innerText = plan.type.includes('swim') ? '🏊‍♂️' : (plan.type === 'rest' ? '💤' : '🏋️');

    const lastWeight = state.weights.length > 0 ? state.weights[state.weights.length - 1].kg : '--';
    document.getElementById('dash-weight').innerText = lastWeight;
    document.getElementById('dash-goal').innerText = state.settings.goalText || "Définir objectif";

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
    document.getElementById('dash-water').innerText = state.nutrition.water.toFixed(1) + ' L';
    document.getElementById('dash-streak').innerText = calculateStreak() + 'j';

    const activeDaysThisWeek = new Set();
    weekLogs.forEach(w => activeDaysThisWeek.add(w.date.split('T')[0]));
    swimLogs.forEach(s => activeDaysThisWeek.add(s.date.split('T')[0]));
    const plannedDaysCount = DAYS_PLAN.filter(d => d.type !== 'rest').length;
    document.getElementById('dash-sessions').innerText = `${activeDaysThisWeek.size} / ${plannedDaysCount}`;

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

function calculateStreak() {
    const dates = [
        ...state.workouts.map(w => w.date.split('T')[0]),
        ...state.swims.map(s => s.date.split('T')[0])
    ].sort((a, b) => new Date(b) - new Date(a));

    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

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
   NUTRITION
   ========================================= */
function renderNutrition() {
    const current = state.nutrition.water;
    const max = 3.0;
    const pct = Math.min((current / max) * 100, 100);
    
    document.getElementById('water-count').innerText = current.toFixed(2);
    document.getElementById('water-bar').style.width = `${pct}%`;

    const container = document.getElementById('diet-container');
    container.innerHTML = '';

    DIET_PLAN.forEach(item => {
        const div = document.createElement('div');
        div.className = "glass p-4 rounded-xl flex items-center gap-4 border border-gray-800";
        div.innerHTML = `
            <div class="font-mono text-accent font-bold text-lg">${item.time}</div>
            <div>
                <div class="text-white font-bold text-sm uppercase">${item.label}</div>
                <div class="text-gray-400 text-xs">${item.desc}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function addWater(amount) {
    state.nutrition.water += amount;
    saveData();
    renderNutrition();
    showToast(`+${amount*1000}ml d'eau 💧`);
}

/* =========================================
   CALENDAR EXPORT
   ========================================= */
function downloadCalendar() {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ChadTracker//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    const daysICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const waterTimes = ["080000", "093000", "110000", "123000", "140000", "153000", "170000", "183000", "200000", "213000"];
    
    waterTimes.forEach(t => {
        icsContent += `BEGIN:VEVENT\nSUMMARY:💧 Hydratation\nRRULE:FREQ=DAILY\nDTSTART;TZID=Europe/Paris:20240101T${t}\nDURATION:PT5M\nEND:VEVENT\n`;
    });

    icsContent += `BEGIN:VEVENT\nSUMMARY:🍎 Collation Matin\nRRULE:FREQ=DAILY\nDTSTART;TZID=Europe/Paris:20240101T103000\nDURATION:PT15M\nEND:VEVENT\n`;
    icsContent += `BEGIN:VEVENT\nSUMMARY:🍌 Collation Aprems\nRRULE:FREQ=DAILY\nDTSTART;TZID=Europe/Paris:20240101T170000\nDURATION:PT15M\nEND:VEVENT\n`;

    DAYS_PLAN.forEach((day, index) => {
        const dayCode = daysICS[index];
        icsContent += `BEGIN:VEVENT\nSUMMARY:📅 Auj: ${day.name}\nRRULE:FREQ=WEEKLY;BYDAY=${dayCode}\nDTSTART;TZID=Europe/Paris:20240101T070000\nDURATION:PT10M\nEND:VEVENT\n`;
    });

    icsContent += `BEGIN:VEVENT\nSUMMARY:🔪 Batch Cooking\nDESCRIPTION:Prépare tes repas de la semaine !\nRRULE:FREQ=WEEKLY;BYDAY=SU\nDTSTART;TZID=Europe/Paris:20240101T170000\nDURATION:PT2H\nEND:VEVENT\n`;
    icsContent += `BEGIN:VEVENT\nSUMMARY:💾 Backup Export JSON\nDESCRIPTION:Sécurise tes données ChadTracker.\nRRULE:FREQ=WEEKLY;BYDAY=SU\nDTSTART;TZID=Europe/Paris:20240101T203000\nDURATION:PT5M\nEND:VEVENT\n`;
    icsContent += `BEGIN:VEVENT\nSUMMARY:📵 Arrêt Téléphone\nDESCRIPTION:Mode Avion activé. Lecture ou dodo.\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\nDTSTART;TZID=Europe/Paris:20240101T221500\nDURATION:PT30M\nEND:VEVENT\n`;

    DAYS_PLAN.forEach((day, index) => {
        if(day.type.includes('swim')) {
            let prevIndex = index - 1;
            if(prevIndex < 0) prevIndex = 6;
            const prevDayCode = daysICS[prevIndex];
            icsContent += `BEGIN:VEVENT\nSUMMARY:🎒 Sac Piscine\nDESCRIPTION:N'oublie pas : Maillot, bonnet, lunettes pour demain !\nRRULE:FREQ=WEEKLY;BYDAY=${prevDayCode}\nDTSTART;TZID=Europe/Paris:20240101T220000\nDURATION:PT15M\nEND:VEVENT\n`;
        }
    });

    DAYS_PLAN.forEach((day, index) => {
        if(day.type === 'rest') return;
        const dayCode = daysICS[index];
        const title = day.type.includes('swim') ? `🏊 ${day.name}` : `🏋️ ${day.name}`;
        icsContent += `BEGIN:VEVENT\nSUMMARY:${title}\nDESCRIPTION:Focus et discipline.\nRRULE:FREQ=WEEKLY;BYDAY=${dayCode}\nDTSTART;TZID=Europe/Paris:20240101T180000\nDURATION:PT1H30M\nEND:VEVENT\n`;
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'chad_planning_v5.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    if (!plan.type.includes('swim') && !currentSessionGoal) {
        // --- AFFICHER MODALE AU LIEU DE PROMPT ---
        const modal = document.getElementById('goal-modal');
        const content = document.getElementById('goal-modal-content');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
        return; // Stop ici
    }

    if (plan.type.includes('swim')) {
        renderSwimInterface(plan, container);
    } else {
        renderMuscleInterface(plan, container);
    }
}

function selectGoal(goal) {
    currentSessionGoal = goal;
    const modal = document.getElementById('goal-modal');
    const content = document.getElementById('goal-modal-content');
    
    modal.classList.add('opacity-0'); 
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        renderWorkoutView(); // Relancer
    }, 300);
}

function renderMuscleInterface(plan, container) {
    const goalBanner = document.createElement('div');
    goalBanner.className = "mb-4 bg-primary/10 border border-primary/50 text-primary px-4 py-3 rounded-xl text-center font-bold uppercase text-sm shadow-sm";
    goalBanner.innerHTML = `🔥 Objectif : <span class="text-white">${currentSessionGoal || 'EXPLOSER TOUT'}</span>`;
    container.appendChild(goalBanner);

    // Date pour filtrer les sets d'aujourd'hui
    const todayStr = new Date().toISOString().split('T')[0];

    plan.exos.forEach((exo, idx) => {
        const history = state.workouts.filter(w => w.exo === exo).slice(-5).reverse();
        const lastSet = history[0];

        // --- NOUVEAU : Calculer les séries faites aujourd'hui ---
        const todaySets = state.workouts.filter(w => w.exo === exo && w.date.startsWith(todayStr)).length;

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
        // Bordure verte si 3 sets ou plus
        const borderColor = todaySets >= 3 ? "border-accent" : "border-gray-800";
        card.className = `glass p-4 rounded-2xl border ${borderColor} transition-colors duration-300`;
        
        card.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <h3 class="font-bold text-white text-lg">${exo}</h3>
                <button onclick="showHistory('${exo}')" class="text-primary text-xs">Historique</button>
            </div>
            
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-bold ${todaySets > 0 ? 'text-accent' : 'text-gray-600'}">
                    Séries faites : ${todaySets}
                </span>
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
                VALIDER SET ${todaySets + 1}
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
    renderDashboard(); // Update stats background
    // Pour mettre à jour le compteur en temps réel sans recharger la vue complète, on recharge juste la vue
    renderWorkoutView();
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
   STATS
   ========================================= */
function renderStats() {
    const select = document.getElementById('stats-exo-select');
    select.innerHTML = "";
    
    let allExos = new Set();
    DAYS_PLAN.forEach(day => {
        if(day.exos) day.exos.forEach(e => allExos.add(e));
    });
    state.workouts.forEach(w => allExos.add(w.exo));
    
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
   SETTINGS
   ========================================= */
function renderSettings() {
    document.getElementById('setting-timer').value = state.settings.timerDefault;
    
    document.getElementById('setting-timer').onchange = (e) => {
        state.settings.timerDefault = parseInt(e.target.value);
        saveData();
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