document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GESTOR DE DATOS ---
    // Centraliza toda la lógica de carga, guardado y manipulación de datos.
    const dataManager = {
        appData: {},
        loadData() {
            const localData = localStorage.getItem('studyHubData');
            if (localData) {
                this.appData = JSON.parse(localData);
            } else if (typeof studyHubData !== 'undefined') {
                this.appData = studyHubData;
                this.saveData();
            } else {
                this.appData = null; // Indica un error de carga
            }
        },
        saveData() {
            localStorage.setItem('studyHubData', JSON.stringify(this.appData));
        },
        getSubjectProgress(subjectKey) {
            const subject = this.appData[subjectKey];
            if (!subject?.topics || Object.keys(subject.topics).length === 0) return 0;
            let totalScore = 0, topicCount = 0;
            for (const topicKey in subject.topics) {
                const stats = this.getStats(topicKey);
                totalScore += stats.score;
                topicCount++;
            }
            return topicCount > 0 ? Math.round(totalScore / topicCount) : 0;
        },
        getStats(topicKey) {
            return JSON.parse(localStorage.getItem(`studyhub-stats-${topicKey}`)) || { score: 0 };
        },
        saveStats(topicKey, stats) {
            localStorage.setItem(`studyhub-stats-${topicKey}`, JSON.stringify(stats));
        },
        deleteSubject(subjectKey) {
            const subject = this.appData[subjectKey];
            if (subject?.topics) {
                for (const topicKey in subject.topics) {
                    localStorage.removeItem(`studyhub-stats-${topicKey}`);
                }
            }
            delete this.appData[subjectKey];
            this.saveData();
        },
        deleteTopic(subjectKey, topicKey) {
            localStorage.removeItem(`studyhub-stats-${topicKey}`);
            delete this.appData[subjectKey].topics[topicKey];
            this.saveData();
        }
    };

    // --- 2. GESTOR DE TEMAS ---
    // Centraliza la lógica para el tema claro/oscuro.
    const themeManager = {
        applyTheme() {
            const currentTheme = localStorage.getItem('theme') || 'dark';
            document.body.classList.toggle('light-mode', currentTheme === 'light');
        },
        toggleTheme(isChecked) {
            const theme = isChecked ? 'light' : 'dark';
            localStorage.setItem('theme', theme);
            this.applyTheme();
        }
    };

    // --- 3. GESTOR DE UI (VISTAS) ---
    // Contiene todas las funciones que generan el HTML de cada vista.
    const ui = {
        appRoot: document.getElementById('app-root'),

        render(html) {
            this.appRoot.innerHTML = html;
        },

        renderError(message) {
            this.render(`<div class="no-subjects"><h1>Error</h1><p>${message}</p><a href="#">Volver al inicio</a></div>`);
        },
        
        setActiveNav(route) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.route === route);
            });
        },
        
        renderHomePage() {
            document.title = 'StudyHub - Inicio';
            this.setActiveNav('home');
            
            let subjectsHTML = '';
            const subjects = dataManager.appData;
            
            if (!subjects || Object.keys(subjects).length === 0) {
                subjectsHTML = '<p class="no-subjects">No tienes asignaturas guardadas.</p>';
            } else {
                let delay = 0;
                for (const key in subjects) {
                    const subject = subjects[key];
                    const progress = dataManager.getSubjectProgress(key);
                    subjectsHTML += `
                        <a href="#subject=${key}" class="subject-card" style="--progress-color: ${subject.themeColor || '#4ade80'}; animation-delay: ${delay}s;">
                            <div class="card-icon-bg" style="background-color: ${subject.themeColor || '#4ade80'}33;">
                                <span class="card-icon">${subject.icon}</span>
                            </div>
                            <h3>${subject.titulo}</h3>
                            <div class="card-progress">
                                <span class="progress-percent">${progress}%</span>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar" style="width: ${progress}%;"></div>
                                </div>
                            </div>
                        </a>`;
                    delay += 0.05;
                }
            }
            
            const html = `
                <section class="hero-section">
                    <h1>Una Forma Más Inteligente de Estudiar</h1>
                    <p>Organiza tus apuntes, repasa con flashcards y ponte a prueba con nuestros tests.</p>
                </section>
                <section id="subjects-section" class="subjects-section">
                    <div class="subjects-header">
                        <h2>Mis Asignaturas</h2>
                        <div class="search-bar">
                            <span class="material-symbols-outlined">search</span>
                            <input type="text" id="search-input" placeholder="Buscar una asignatura...">
                        </div>
                    </div>
                    <div id="subjects-grid" class="subjects-grid">${subjectsHTML}</div>
                </section>`;

            this.render(html);
            
            // Lógica de búsqueda
            const searchInput = document.getElementById('search-input');
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase().trim();
                document.querySelectorAll('.subject-card').forEach(card => {
                    const title = card.querySelector('h3').textContent.toLowerCase();
                    card.style.display = title.includes(query) ? 'flex' : 'none';
                });
            });
        },
        
        renderSubjectPage(subjectKey) {
            const subject = dataManager.appData[subjectKey];
            if (!subject) {
                this.renderError('Asignatura no encontrada.');
                return;
            }

            document.title = `Temas de ${subject.titulo}`;
            this.setActiveNav('subjects');
            document.documentElement.style.setProperty('--accent-blue', subject.themeColor || '#3b82f6');

            let topicsHTML = '';
            const topics = subject.topics || {};

            if (Object.keys(topics).length === 0) {
                topicsHTML = '<p class="no-subjects">No hay temas para esta asignatura todavía.</p>';
            } else {
                for (const topicKey in topics) {
                    const topic = topics[topicKey];
                    const stats = dataManager.getStats(topicKey);
                    topicsHTML += `
                        <a href="#subject=${subjectKey}&topic=${topicKey}" class="subject-card" style="--progress-color: ${subject.themeColor || '#3b82f6'};">
                            <div class="card-icon-bg" style="background-color: ${subject.themeColor || '#3b82f6'}33;">
                                <span class="card-icon">📚</span>
                            </div>
                            <h3>${topic.titulo}</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; flex-grow: 1; min-height: 40px;">${topic.descripcion}</p>
                            <div class="card-progress">
                                <span class="progress-percent">${stats.score}%</span>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar" style="width: ${stats.score}%;"></div>
                                </div>
                            </div>
                        </a>`;
                }
            }

            const html = `
                <div class="topic-header">
                    <a href="#" class="back-button">&larr; Volver a Mis Asignaturas</a>
                    <h1>${subject.icon} ${subject.titulo}</h1>
                </div>
                <div class="subjects-grid">${topicsHTML}</div>
                <div class="delete-section">
                    <button id="delete-subject-btn" class="action-button danger">
                        <span class="material-symbols-outlined">delete</span>
                        Eliminar Asignatura
                    </button>
                </div>`;
            
            this.render(html);

            document.getElementById('delete-subject-btn').addEventListener('click', () => {
                 if (confirm(`¿Estás seguro de que quieres eliminar la asignatura "${subject.titulo}"? Esta acción no se puede deshacer.`)) {
                    dataManager.deleteSubject(subjectKey);
                    alert(`La asignatura "${subject.titulo}" ha sido eliminada.`);
                    window.location.hash = '';
                }
            });
        },

        renderTopicPage(subjectKey, topicKey) {
            const subject = dataManager.appData[subjectKey];
            const topic = subject?.topics?.[topicKey];

            if (!subject || !topic) {
                this.renderError('Tema no encontrado.');
                return;
            }

            document.title = `Estudiando: ${topic.titulo}`;
            this.setActiveNav('subjects');
            document.documentElement.style.setProperty('--accent-blue', subject.themeColor || '#3b82f6');
            
            const flashcardsCount = topic.flashcardData?.length || 0;
            const testCount = topic.quizData?.length || 0;

            const html = `
                <div class="topic-header">
                    <a href="#subject=${subjectKey}" class="back-button">&larr; Volver a Temas</a>
                    <h1>${topic.titulo}</h1>
                </div>
                <nav class="study-nav">
                    <button class="nav-button active" data-view="flashcards-view">Flashcards <span class="nav-count">${flashcardsCount}</span></button>
                    <button class="nav-button" data-view="test-view">Test <span class="nav-count">${testCount}</span></button>
                    <button class="nav-button" data-view="active-recall-view">Active Recall <span class="nav-count">${flashcardsCount}</span></button>
                </nav>
                <div id="flashcards-view" class="view-container"></div>
                <div id="test-view" class="view-container hidden"></div>
                <div id="active-recall-view" class="view-container hidden"></div>
                <div class="delete-section">
                    <button id="delete-topic-btn" class="action-button danger">
                        <span class="material-symbols-outlined">delete</span>
                        Eliminar Tema
                    </button>
                </div>`;

            this.render(html);
            
            this.renderFlashcards(topic.flashcardData || []);
            this.renderTest(topic.quizData || [], topicKey);

            // Event Listeners for topic page
            document.querySelector('.study-nav').addEventListener('click', e => {
                if (e.target.matches('.nav-button')) {
                    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    const viewId = e.target.dataset.view;
                    document.querySelectorAll('.view-container').forEach(view => {
                        view.classList.toggle('hidden', view.id !== viewId);
                    });
                    if (viewId === 'active-recall-view') {
                        this.initActiveRecall(topic.flashcardData || []);
                    }
                }
            });
            
            document.getElementById('delete-topic-btn').addEventListener('click', () => {
                 if (confirm(`¿Estás seguro de que quieres eliminar el tema "${topic.titulo}"? Esta acción no se puede deshacer.`)) {
                    dataManager.deleteTopic(subjectKey, topicKey);
                    alert(`El tema "${topic.titulo}" ha sido eliminado.`);
                    window.location.hash = `#subject=${subjectKey}`;
                }
            });
        },
        
        renderFlashcards(cards) {
            const container = document.getElementById('flashcards-view');
            if (cards.length === 0) {
                container.innerHTML = "<p class='no-subjects'>No hay flashcards para este tema.</p>";
                return;
            }
            container.innerHTML = `<div class="flashcard-grid">${cards.map(card => `
                <div class="flashcard-scene">
                    <div class="flashcard">
                        <div class="fc-face fc-face--front"><p>${card.q}</p></div>
                        <div class="fc-face fc-face--back"><p>${card.a}</p></div>
                    </div>
                </div>`).join('')}</div>`;
            // Event delegation for efficiency
            container.addEventListener('click', e => {
                const card = e.target.closest('.flashcard');
                if (card) {
                    card.classList.toggle('is-flipped');
                }
            });
        },

        renderTest(questions, topicKey) {
            const view = document.getElementById('test-view');
            if (questions.length === 0) {
                view.innerHTML = "<p class='no-subjects'>No hay preguntas para este test.</p>";
                return;
            }
            view.innerHTML = `
                <div class="test-container">
                    <form id="test-form">
                        ${questions.map((q, index) => {
                            const optionsHtml = q.o.map((optionText, i) => `<input type="radio" name="question-${index}" id="q${index}o${'ABCD'[i]}" value="${'ABCD'[i]}"><label for="q${index}o${'ABCD'[i]}" class="option-button">${optionText}</label>`).join('');
                            return `<div class="quiz-question-group"><p>${index + 1}. ${q.q}</p><div class="test-options">${optionsHtml}</div></div>`;
                        }).join('')}
                    </form>
                    <div class="test-footer">
                        <button id="grade-test-btn" class="action-button">Calificar Test</button>
                        <div id="test-results-summary" class="hidden"></div>
                    </div>
                </div>`;
            
            document.getElementById('grade-test-btn').addEventListener('click', () => this.gradeTest(questions, topicKey));
        },

        gradeTest(questions, topicKey) {
            let score = 0;
            const form = document.getElementById('test-form');
            questions.forEach((q, index) => {
                const optionsContainer = form.querySelector(`input[name="question-${index}"]`).closest('.test-options');
                optionsContainer.querySelectorAll('label').forEach(label => label.classList.add('disabled'));
                
                const correctLabel = optionsContainer.querySelector(`label[for="q${index}o${q.a}"]`);
                if (correctLabel) correctLabel.classList.add('correct');
                
                const selectedRadio = optionsContainer.querySelector('input:checked');
                if (selectedRadio) {
                    if (selectedRadio.value === q.a) score++;
                    else {
                        const selectedLabel = optionsContainer.querySelector(`label[for="${selectedRadio.id}"]`);
                        if (selectedLabel) selectedLabel.classList.add('incorrect');
                    }
                }
            });
            const total = questions.length;
            const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
            
            const resultsSummary = document.getElementById('test-results-summary');
            resultsSummary.innerHTML = `<h2>Resultados</h2><p>Tu puntuación: ${score} de ${total} (${percentage}%)</p><button id="repeat-test-btn" class="action-button secondary">Repetir Test</button>`;
            resultsSummary.classList.remove('hidden');
            document.getElementById('grade-test-btn').classList.add('hidden');
            
            dataManager.saveStats(topicKey, { score: percentage, date: new Date().toLocaleDateString('es-ES') });
            document.getElementById('repeat-test-btn').addEventListener('click', () => this.renderTest(questions, topicKey));
        },
        
        initActiveRecall(originalCards) {
             const container = document.getElementById('active-recall-view');
             if (!container || container.querySelector('.ar-wrapper')) return;

             if (originalCards.length === 0) {
                 container.innerHTML = "<div class='ar-wrapper'><p class='no-subjects'>No hay material para el modo de recuperación activa.</p></div>";
                 return;
             }

             let cardsToStudy = [...originalCards];
             let cardsToRetry = [];
             let currentIndex = 0;

             const startSession = (sessionCards) => {
                 cardsToStudy = [...sessionCards];
                 cardsToRetry = [];
                 currentIndex = 0;
                 if (cardsToStudy.length > 0) renderCard(0);
                 else showFinalScreen();
             };

             const showCard = (index) => {
                 const card = cardsToStudy[index];
                 document.getElementById('ar-current-card').textContent = index + 1;
                 document.getElementById('ar-question-text').innerHTML = card.q;
                 document.getElementById('ar-answer-text').innerHTML = card.a;
                 document.getElementById('ar-answer-container').classList.add('hidden');
                 document.getElementById('ar-rating-buttons').classList.add('hidden');
                 document.getElementById('ar-show-answer-btn').classList.remove('hidden');
             };

             const nextCard = () => {
                 currentIndex++;
                 if (currentIndex < cardsToStudy.length) showCard(currentIndex);
                 else showSessionResults();
             };
            
             const renderCard = (index) => {
                 container.innerHTML = `<div class="ar-wrapper">
                    <div class="ar-progress">Tarjeta <span id="ar-current-card">1</span> de <span id="ar-total-cards">${cardsToStudy.length}</span></div>
                    <div class="ar-card">
                        <div class="ar-question"><p id="ar-question-text"></p></div>
                        <div id="ar-answer-container" class="ar-answer-container hidden"><p id="ar-answer-text"></p></div>
                        <div id="ar-rating-buttons" class="ar-rating-buttons hidden">
                            <button id="ar-incorrect-btn" class="action-button incorrect-btn">No la sabía</button>
                            <button id="ar-correct-btn" class="action-button correct-btn">¡La sabía!</button>
                        </div>
                    </div>
                    <div class="ar-controls"><button id="ar-show-answer-btn" class="action-button">Mostrar Respuesta</button></div>
                 </div>`;
                 showCard(index);
             };

             const showSessionResults = () => {
                 container.innerHTML = `
                    <div class="ar-wrapper ar-results-screen">
                        <h2>¡Sesión Completada!</h2>
                        <p>Has repasado todas las tarjetas. Tienes ${cardsToRetry.length} tarjetas marcadas para volver a estudiar.</p>
                        <div class="ar-controls">
                            <button id="ar-retry-btn" class="action-button">Estudiar las que no sabía</button>
                            <button id="ar-restart-btn" class="action-button secondary">Volver a empezar todo</button>
                        </div>
                    </div>`;
                 document.getElementById('ar-retry-btn').disabled = cardsToRetry.length === 0;
                 document.getElementById('ar-retry-btn').addEventListener('click', () => startSession(cardsToRetry));
                 document.getElementById('ar-restart-btn').addEventListener('click', () => startSession(originalCards));
             };

             const showFinalScreen = () => {
                 container.innerHTML = `
                    <div class="ar-wrapper ar-results-screen">
                        <h2>¡Felicidades!</h2>
                        <p>¡Has dominado todas las tarjetas de este tema!</p>
                        <div class="ar-controls"><button id="ar-restart-btn" class="action-button">Volver a empezar</button></div>
                    </div>`;
                 document.getElementById('ar-restart-btn').addEventListener('click', () => startSession(originalCards));
             };
            
             container.addEventListener('click', e => {
                 if (e.target.id === 'ar-show-answer-btn') {
                     document.getElementById('ar-answer-container').classList.remove('hidden');
                     document.getElementById('ar-rating-buttons').classList.remove('hidden');
                     document.getElementById('ar-show-answer-btn').classList.add('hidden');
                 } else if (e.target.id === 'ar-correct-btn') {
                     nextCard();
                 } else if (e.target.id === 'ar-incorrect-btn') {
                     cardsToRetry.push(cardsToStudy[currentIndex]);
                     nextCard();
                 }
             });

             startSession(cardsToStudy);
        },

        renderSettingsPage() {
            document.title = 'StudyHub - Ajustes';
            this.setActiveNav('settings');
            
            const isLight = document.body.classList.contains('light-mode');
            const html = `
                <section class="settings-section">
                    <h1>Ajustes</h1>
                    <div class="setting-item">
                        <div class="setting-text">
                            <h3>Apariencia</h3>
                            <p>Cambia entre el tema claro y oscuro.</p>
                        </div>
                        <div class="setting-control">
                            <label class="theme-switch">
                                <input type="checkbox" id="theme-toggle" ${isLight ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </section>`;
            
            this.render(html);

            document.getElementById('theme-toggle').addEventListener('change', (e) => {
                themeManager.toggleTheme(e.target.checked);
            });
        }
    };

    // --- 4. ROUTER ---
    // Gestiona las rutas de la aplicación (qué vista mostrar).
    const router = {
        routes: {},
        init() {
            window.addEventListener('hashchange', () => this.route());
            // Manejar clics de navegación para no recargar la página
            document.body.addEventListener('click', e => {
                if(e.target.matches('[data-route]')) {
                    e.preventDefault();
                    window.location.hash = e.target.dataset.route === 'home' ? '' : `#${e.target.dataset.route}`;
                } else if(e.target.closest('a')?.getAttribute('href')?.startsWith('#')) {
                    // Prevenir recarga para otros enlaces de hash
                    e.preventDefault();
                    window.location.hash = e.target.closest('a').getAttribute('href');
                }
            });
            this.route();
        },
        route() {
            const hash = window.location.hash.slice(1);
            if (dataManager.appData === null) {
                ui.renderError("No se pudieron cargar los datos de la aplicación. Por favor, recarga la página.");
                return;
            }

            // Restablecer el color de acento por defecto
            document.documentElement.style.setProperty('--accent-blue', '#3b82f6');

            if (hash.startsWith('subject=')) {
                const params = new URLSearchParams(hash);
                const subjectKey = params.get('subject');
                const topicKey = params.get('topic');
                if (topicKey) {
                    ui.renderTopicPage(subjectKey, topicKey);
                } else {
                    ui.renderSubjectPage(subjectKey);
                }
            } else if (hash.startsWith('settings')) {
                ui.renderSettingsPage();
            } else if (hash.startsWith('subjects-section')) {
                 // Redirigir ancla a la página principal
                 window.location.hash = '';
                 // Scroll suave al elemento
                 setTimeout(() => {
                    document.getElementById('subjects-section')?.scrollIntoView({ behavior: 'smooth' });
                 }, 100);
            } else {
                ui.renderHomePage();
            }
        }
    };

    // --- INICIALIZACIÓN DE LA APLICACIÓN ---
    dataManager.loadData();
    themeManager.applyTheme();
    router.init();
});