// simulator.js VERSIÓN CON PORTADA

let casesData = [];
let currentCaseId = null;
let currentNodeKey = 'start';
let currentScores = {};
let activeCompetencyMap = {};

// --- AÑADIMOS LA NUEVA PANTALLA A LA LISTA ---
const screens = ['splash-screen', 'degree-selection-screen', 'welcome-screen', 'case-selection-screen', 'simulation-screen', 'evaluation-screen'];

const competencyMaps = {
    gerontologia: {
        empathy: { name: "Empatía y vínculo terapéutico", description: "Capacidad de comprender y validar las emociones del interlocutor." },
        acp: { name: "Aplicación del modelo ACP", description: "Habilidad para centrar la intervención en las preferencias y valores de la persona." },
        assertiveness: { name: "Comunicación asertiva", description: "Habilidad para expresar ideas y límites de forma clara y respetuosa." },
        conflict: { name: "Resolución de conflictos", description: "Capacidad para gestionar desacuerdos y encontrar soluciones." }
    },
    enfermeria: {
        protocol: { name: "Adherencia al protocolo SVA", description: "Seguimiento correcto de los pasos y algoritmos de Soporte Vital Avanzado." },
        decision: { name: "Toma de decisiones clínicas", description: "Capacidad para tomar decisiones críticas y priorizar intervenciones bajo presión." },
        teamwork: { name: "Liderazgo y trabajo en equipo", description: "Habilidad para coordinar al equipo, comunicar órdenes claras y asegurar un entorno seguro." },
        technique: { name: "Habilidad técnica", description: "Ejecución correcta de procedimientos como la desfibrilación y la administración de fármacos." }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadDegrees(); // Carga las titulaciones en segundo plano
    showScreen('splash-screen'); // Muestra la nueva pantalla de portada
});

async function loadDegrees() {
    try {
        const response = await fetch('casos/titulaciones.json');
        if (!response.ok) throw new Error('No se encuentra el archivo de titulaciones');
        const degrees = await response.json();

        const grid = document.getElementById('degree-grid');
        grid.innerHTML = '';
        degrees.forEach(degree => {
            const card = document.createElement('div');
            card.className = 'case-card bg-white p-6 rounded-lg shadow-md cursor-pointer';
            card.onclick = () => selectDegree(degree.manifest, degree.nombre);
            card.innerHTML = `<h2 class="text-xl font-bold text-sky-700 mb-2">${degree.nombre}</h2><p class="text-gray-600">${degree.descripcion}</p>`;
            grid.appendChild(card);
        });
        // Ya no mostramos la pantalla aquí, solo la preparamos
    } catch (error) {
        console.error("Error al cargar las titulaciones:", error);
        // Opcional: mostrar un error en la pantalla de selección de titulaciones
        document.getElementById('degree-grid').innerHTML = `<p class="text-red-500 col-span-full text-center">Error: No se pudo cargar el archivo de titulaciones. Revisa que 'casos/titulaciones.json' existe y es correcto.</p>`;
    }
}

function selectDegree(manifestFile, degreeName) {
    document.getElementById('welcome-degree-title').textContent = degreeName;
    loadCases(manifestFile);
    showScreen('welcome-screen');
}

async function loadCases(manifestFile) {
    try {
        const manifestResponse = await fetch(manifestFile);
        if (!manifestResponse.ok) throw new Error(`Error al cargar el índice: ${manifestFile}`);
        const manifest = await manifestResponse.json();
        
        activeCompetencyMap = competencyMaps[manifest.competencyMapId] || competencyMaps.gerontologia;

        const fetchPromises = manifest.casos.map(caseFile =>
            fetch(caseFile).then(res => {
                if (!res.ok) throw new Error(`Error al cargar el caso: ${caseFile}`);
                return res.json();
            })
        );
        
        const loadedCases = await Promise.all(fetchPromises);
        casesData = loadedCases.sort((a, b) => a.id - b.id);
        populateCaseSelection();
    } catch (error) {
        console.error("No se pudieron cargar los casos:", error);
        casesData = []; 
        populateCaseSelection();
        alert(`Hubo un error al cargar los casos para esta titulación. Es posible que el archivo "${manifestFile}" no exista o esté vacío.`);
        showScreen('degree-selection-screen');
    }
}

function showScreen(screenId) {
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function goBackToDegreeSelection() {
    showScreen('degree-selection-screen');
}

function populateCaseSelection() {
    const grid = document.getElementById('case-grid');
    grid.innerHTML = '';
    if (casesData.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 col-span-full text-center">No hay casos disponibles para esta titulación.</p>';
        return;
    }
    casesData.forEach(caseInfo => {
        const card = document.createElement('div');
        card.className = 'case-card bg-white p-6 rounded-lg shadow-md cursor-pointer';
        card.onclick = () => startCase(caseInfo.id);
        card.innerHTML = `<h2 class="text-xl font-bold text-sky-700 mb-2">${caseInfo.id}. ${caseInfo.title}</h2><p class="text-sm font-semibold text-gray-500 mb-3">${caseInfo.subject}</p><p class="text-gray-600">${caseInfo.description}</p>`;
        grid.appendChild(card);
    });
}

function startCase(caseId) {
    currentCaseId = caseId;
    currentNodeKey = 'start';
    currentScores = {};
    Object.keys(activeCompetencyMap).forEach(key => {
        currentScores[key] = 0;
    });

    const caseData = casesData.find(c => c.id === caseId);
    document.getElementById('character-name').textContent = caseData.character.name;
    document.getElementById('character-avatar').src = caseData.character.avatar;
    renderNode();
    showScreen('simulation-screen');
}

function restartCase() {
    if (currentCaseId) startCase(currentCaseId);
}

function renderNode() {
    const caseData = casesData.find(c => c.id === currentCaseId);
    const node = caseData.nodes[currentNodeKey];
    document.getElementById('simulation-text').textContent = node.text;
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';
    if (node.media && node.media.url) {
        if (node.media.type === 'image') {
            mediaContainer.innerHTML = `<img src="${node.media.url}" alt="Imagen del caso" class="rounded-lg mx-auto max-w-sm w-full shadow-md">`;
        } else if (node.media.type === 'video') {
            mediaContainer.innerHTML = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000;"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="${node.media.url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="rounded-lg"></iframe></div>`;
        }
    }
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    if (node.options) {
        node.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-button block w-full text-left bg-sky-100 p-4 rounded-lg hover:bg-sky-200';
            button.textContent = option.text;
            button.onclick = () => selectOption(index);
            optionsContainer.appendChild(button);
        });
    }
}

function selectOption(optionIndex) {
    const caseData = casesData.find(c => c.id === currentCaseId);
    const option = caseData.nodes[currentNodeKey].options[optionIndex];
    if (option.scores) {
        for (const key in option.scores) {
            if (currentScores.hasOwnProperty(key)) {
                currentScores[key] += option.scores[key];
            }
        }
    }
    currentNodeKey = option.next;
    if (currentNodeKey === 'end') {
        showEvaluation();
    } else {
        renderNode();
    }
}

function showEvaluation() {
    const caseData = casesData.find(c => c.id === currentCaseId);
    document.getElementById('evaluation-case-title').textContent = `${caseData.id}. ${caseData.title}`;
    const matrixContainer = document.getElementById('competency-matrix');
    matrixContainer.innerHTML = '';
    
    for (const key in currentScores) {
        const scoreValue = currentScores[key];
        const normalizedScore = Math.max(1, Math.min(5, 3 + Math.floor(scoreValue / 2.5)));
        const competencyInfo = activeCompetencyMap[key];
        
        const competencyDiv = document.createElement('div');
        competencyDiv.innerHTML = `<p class="font-semibold">${competencyInfo.name}</p><p class="text-sm text-gray-500 italic mb-2">${competencyInfo.description}</p><div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-sky-600 h-2.5 rounded-full" style="width: ${normalizedScore * 20}%"></div></div><p class="text-right text-sm text-gray-500">${normalizedScore} / 5</p>`;
        matrixContainer.appendChild(competencyDiv);
    }
    
    document.getElementById('feedback-strengths').textContent = "Buen trabajo manteniendo el enfoque en las prioridades.";
    document.getElementById('feedback-improvements').textContent = "Revisa el algoritmo para optimizar los tiempos de intervención.";
    showScreen('evaluation-screen');
}