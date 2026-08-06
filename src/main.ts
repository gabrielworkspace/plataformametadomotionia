import { createClient, User } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://iaphqmusbzpjxhzfskok.supabase.co';
const supabaseKey = 'sb_publishable_-Tt9j1kna_tNrb4c11wlkA_vccb6m9O';
const supabase = createClient(supabaseUrl, supabaseKey);

// Estado Global
let currentUser: User | null = null;
let userRole: string = 'student'; // 'admin' ou 'student'
let alunoId: string = "aluno_visitante"; 
let currentSessionId: string = crypto.randomUUID(); // ID único para a conversa atual

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa Lucide Icons para todo o HTML estático
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Helper: Faz o parsing de prompts formatados com flexibilidade
    function parsePromptSections(rawText) {
        let initial = '', instructions = '', final = '';
        
        // Regexes para pegar os títulos exatos e variações, ignorando emojis e markdown
        const initialRegex = /Prompt\s*(?:Frame\s*)?Inicial/i;
        const instructionsRegex = /Roteiro(?: e Instruções)?|Instruções|Conceito/i;
        const finalRegex = /Prompt\s*(?:Frame\s*)?Final/i;
        
        // Função auxiliar para ter certeza que é um título (linha curta)
        const isHeader = (line, regex) => line.trim().length < 80 && regex.test(line);
        
        // Verifica se o texto possui alguma das marcações
        if (initialRegex.test(rawText) || instructionsRegex.test(rawText) || finalRegex.test(rawText)) {
            let currentSection = 'initial';
            
            // Tenta adivinhar com o que começa caso falte o primeiro header
            const lines = rawText.split('\n');
            if (lines.length > 0 && !isHeader(lines[0], initialRegex)) {
                if (isHeader(lines[0], instructionsRegex)) currentSection = 'instructions';
                else if (isHeader(lines[0], finalRegex)) currentSection = 'final';
            }
            
            for (const line of lines) {
                if (isHeader(line, initialRegex)) { currentSection = 'initial'; continue; }
                if (isHeader(line, instructionsRegex)) { currentSection = 'instructions'; continue; }
                if (isHeader(line, finalRegex)) { currentSection = 'final'; continue; }
                
                if (currentSection === 'initial') initial += line + '\n';
                else if (currentSection === 'instructions') instructions += line + '\n';
                else if (currentSection === 'final') final += line + '\n';
            }
        } else {
            initial = rawText;
        }
        
        return { initial: initial.trim(), instructions: instructions.trim(), final: final.trim() };
    }

    const appContainer = document.querySelector('.app-container') as HTMLElement;
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const suggestionCards = document.querySelectorAll('.suggestion-card');

    // UI Elements - User Profile
    const userProfileBtn = document.getElementById('user-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const userAvatar = document.getElementById('user-avatar');

    // Suggestion Cards na tela inicial
    document.addEventListener('click', (e) => {
        const card = (e.target as Element).closest('.suggestion-card');
        if (card) {
            const p = card.querySelector('p');
            if (p) {
                chatInput.value = p.textContent || '';
                chatInput.dispatchEvent(new Event('input'));
                sendMessage();
            }
        }
    });

    // Auth Login Page
    const loginPage = document.getElementById('login-page');
    const authForm = document.getElementById('auth-form');
    const toggleAuthBtn = document.getElementById('toggle-auth-mode-btn');
    const togglePromptText = document.getElementById('toggle-prompt-text');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const loginSubtitle = document.getElementById('login-subtitle');
    let isLoginMode = true;

    // Typewriter and Background Logic
    let typewriterTimeout: number | undefined;
    
    function setupAuthUI() {
        const bgSide = document.getElementById('login-image-side');
        const quoteAuthor = document.getElementById('quote-author');
        const twText = document.getElementById('typewriter-text');
        
        if (!bgSide || !quoteAuthor || !twText) return;
        
        const signInQuotes = [
            "Crie prompts perfeitos do zero com extrema facilidade.",
            "Melhore e otimize os prompts que você já usa.",
            "Armazene tudo e acesse a biblioteca exclusiva do Método.",
            "Rápido, prático e focado em resultados."
        ];
        const signUpQuote = "Liberte o potencial da IA com praticidade e eficiência extrema.";
        
        bgSide.style.backgroundImage = 'none'; 
        if (isLoginMode) {
            bgSide.classList.add('login-mode');
            bgSide.classList.remove('signup-mode');
        } else {
            bgSide.classList.add('signup-mode');
            bgSide.classList.remove('login-mode');
        }

        quoteAuthor.textContent = "— Motion IA Team";
        
        twText.textContent = "";
        if (typewriterTimeout) clearTimeout(typewriterTimeout);
        
        if (!isLoginMode) {
            // Apenas digita uma vez para o signup
            let i = 0;
            function typeWriterSingle() {
                if (i < signUpQuote.length) {
                    twText.textContent += signUpQuote.charAt(i);
                    i++;
                    typewriterTimeout = window.setTimeout(typeWriterSingle, 60);
                }
            }
            typeWriterSingle();
        } else {
            // Rotacionar frases no login
            let quoteIndex = 0;
            let charIndex = 0;
            let isDeleting = false;
            
            function typeWriterRotating() {
                const currentQuote = signInQuotes[quoteIndex];
                
                if (isDeleting) {
                    twText.textContent = currentQuote.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    twText.textContent = currentQuote.substring(0, charIndex + 1);
                    charIndex++;
                }
                
                let typeSpeed = isDeleting ? 30 : 60;
                
                if (!isDeleting && charIndex === currentQuote.length) {
                    typeSpeed = 2000; // Pausa no final da frase
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    quoteIndex = (quoteIndex + 1) % signInQuotes.length;
                    typeSpeed = 500; // Pausa antes da próxima
                }
                
                typewriterTimeout = window.setTimeout(typeWriterRotating, typeSpeed);
            }
            typeWriterRotating();
        }
    }
    // Initialize Typewriter
    setupAuthUI();

    // Warehouse Sidebar
    const wTabs = document.querySelectorAll('.w-tab');
    const wGlobalContent = document.getElementById('warehouse-content-global');
    const wMyPromptsContent = document.getElementById('warehouse-content-my-prompts');
    const wMyPromptsTab = document.querySelector('.w-tab[data-target="warehouse-content-my-prompts"]');
    const addPromptBtn = document.getElementById('add-prompt-btn');

    // UI Buttons
    const chatHistoryList = document.getElementById('chat-history-list');

    // Add Prompt Modal (Admin)
    const addPromptModal = document.getElementById('add-prompt-modal');
    const closeAddPromptBtn = document.getElementById('close-add-prompt-btn');
    const addPromptForm = document.getElementById('add-prompt-form');

    // ==========================================
    // AUTENTICAÇÃO E CONTROLE DE ESTADO (Supabase)
    // ==========================================
    
    // Função para atualizar a interface baseada no usuário
    async function handleAuthStateChange(user) {
        if (user) {
            currentUser = user;
            alunoId = user.id; // Atualiza o alunoId com o ID real do usuário
            
            // Buscar role do usuário no banco (tabela users)
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                
                if (data) {
                    userRole = data.role || 'student';
                } else {
                    // Se não existe na tabela users, cria o registro inicial
                    userRole = 'student';
                    await supabase.from('users').insert([
                        { id: user.id, email: user.email, role: 'student' }
                    ]);
                }
            } catch (err) {
                console.error("Erro ao buscar role:", err);
                userRole = 'student';
            }

            // Carrega os prompts do usuário e globais (Background)
            loadMyPrompts();
            loadGlobalPrompts();

            // Atualiza UI Profile
            userNameDisplay.textContent = user.email.split('@')[0];
            userRoleDisplay.textContent = userRole === 'admin' ? 'Administrador' : 'Aluno';
            userAvatar.src = `https://ui-avatars.com/api/?name=${user.email}&background=6366f1&color=fff`;
            logoutBtn.style.display = 'block';

            const adminSupportBtn = document.getElementById('admin-support-btn');
            const supportWidget = document.getElementById('support-widget');
            
            if (userRole === 'admin') {
                addPromptBtn.style.display = 'flex';
                if (adminSupportBtn) adminSupportBtn.style.display = 'flex';
                if (supportWidget) supportWidget.style.display = 'none';
            } else {
                addPromptBtn.style.display = 'none';
                if (adminSupportBtn) adminSupportBtn.style.display = 'none';
                if (supportWidget) supportWidget.style.display = 'flex';
            }

            // Update Dashboard Profile
            const dashboardUserName = document.getElementById('dashboard-user-name');
            const dashboardUserRole = document.getElementById('dashboard-user-role');
            const dashboardUserAvatar = document.getElementById('dashboard-user-avatar') as HTMLImageElement;
            if (dashboardUserName) dashboardUserName.textContent = user.email.split('@')[0];
            if (dashboardUserRole) dashboardUserRole.textContent = userRole === 'admin' ? 'Administrador' : 'Aluno';
            if (dashboardUserAvatar) dashboardUserAvatar.src = `https://ui-avatars.com/api/?name=${user.email}&background=6366f1&color=fff`;

            // Unlock app (with Processing Screen)
            const dashboardContainer = document.getElementById('dashboard-container');
            if (loginPage.style.display !== 'none') {
                await runProcessingScreen();
            } else {
                const processingPage = document.getElementById('processing-page');
                if (processingPage) processingPage.style.display = 'none';
                loginPage.style.display = 'none';
                if (dashboardContainer) dashboardContainer.style.display = 'flex';
            }

        } else {
            // Deslogado (Lock app)
            currentUser = null;
            userRole = 'student';
            alunoId = "aluno_visitante";
            
            appContainer.style.display = 'none';
            loginPage.style.display = 'flex';
            if (document.getElementById('processing-page')) document.getElementById('processing-page').style.display = 'none';
            
            userNameDisplay.textContent = 'Entrar / Cadastrar';
            userRoleDisplay.textContent = 'Faça login para salvar';
            userAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff';
            logoutBtn.style.display = 'none';
            addPromptBtn.style.display = 'none';
            const adminSupportBtn = document.getElementById('admin-support-btn');
            const supportWidget = document.getElementById('support-widget');
            if (adminSupportBtn) adminSupportBtn.style.display = 'none';
            if (supportWidget) supportWidget.style.display = 'none';
            
            wMyPromptsContent.innerHTML = '<div class="loading-prompts">Faça login para ver e salvar seus prompts.</div>';
        }
    }

    // Listener do Supabase para mudanças de auth (login/logout)
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(session?.user || null);
        });

        // Verificar sessão inicial
        const { data: { session } } = await supabase.auth.getSession();
        handleAuthStateChange(session?.user || null);
    }

    // Ação do Perfil de Usuário
    userProfileBtn.addEventListener('click', (e) => {
        if (!currentUser) {
            loginPage.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    });

    // Nova Conversa (Dropdown)
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            currentSessionId = crypto.randomUUID();
            messagesContainer.innerHTML = `
                <div class="welcome-screen">
                    <div class="welcome-hero">
                        <div class="logo-icon-large">M</div>
                        <h1>Instrutor de Prompt</h1>
                        <p>O <strong>Método Motion IA</strong> configurado com as melhores práticas para extrair o máximo do <strong>Google Omni</strong>.</p>
                    </div>
                    
                    <div class="suggestion-grid">
                        <div class="suggestion-card">
                            <p>Me ajude a criar um prompt perfeito do zero.</p>
                        </div>
                        <div class="suggestion-card">
                            <p>Quero otimizar e melhorar um prompt que já uso.</p>
                        </div>
                        <div class="suggestion-card">
                            <p>Crie um prompt de vendas focado na área comercial.</p>
                        </div>
                    </div>
                </div>`;
        });
    }

    // Alternar abas do Auth
    if (toggleAuthBtn && togglePromptText) {
        toggleAuthBtn.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
            togglePromptText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
            toggleAuthBtn.textContent = isLoginMode ? "Sign up" : "Sign in";
            
            // Mostra/esconde campos exclusivos de cadastro
            document.querySelectorAll('.register-only').forEach(el => {
                (el as HTMLElement).style.display = isLoginMode ? 'none' : 'flex'; // flex for form-group
            });
            
            document.querySelectorAll('.login-only').forEach(el => {
                (el as HTMLElement).style.display = isLoginMode ? 'flex' : 'none';
            });
            
            const loginMainTitle = document.getElementById('login-main-title');
            if (loginMainTitle) {
                loginMainTitle.textContent = isLoginMode ? 'Sign in to your account' : 'Create an account';
            }

            if (loginSubtitle) {
                loginSubtitle.textContent = isLoginMode ? 'Enter your email below to sign in' : 'Enter your details below to sign up';
            }
            authError.style.display = 'none';
            
            setupAuthUI();
        });
    }

    // Mostrar/Esconder Senha
    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = authPassword.type === 'password' ? 'text' : 'password';
            authPassword.type = type;
            
            // Troca o ícone
            if (type === 'text') {
                togglePasswordBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>';
            } else {
                togglePasswordBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            }
        });
    }

    // Medidor de Força de Senha
    const strengthBarFill = document.getElementById('strength-bar-fill');
    const strengthText = document.getElementById('strength-text');
    
    authPassword.addEventListener('input', (e) => {
        if (isLoginMode) return; // Só mostra na criação de conta
        
        const val = (e.target as HTMLInputElement).value;
        let score = 0;
        
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[a-z]/.test(val)) score++;
        if (/\d/.test(val)) score++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val)) score++;

        let color = '#ef4444'; // Fraca (Vermelho)
        let text = 'Muito Fraca';
        let width = '20%';

        if (score === 2) { color = '#f97316'; text = 'Fraca'; width = '40%'; } // Laranja
        else if (score === 3) { color = '#eab308'; text = 'Razoável'; width = '60%'; } // Amarelo
        else if (score === 4) { color = '#3b82f6'; text = 'Boa'; width = '80%'; } // Azul
        else if (score >= 5) { color = '#22c55e'; text = 'Forte'; width = '100%'; } // Verde
        
        if (val.length === 0) { width = '0%'; text = 'Força da Senha'; }

        if (strengthBarFill && strengthText) {
            strengthBarFill.style.width = width;
            strengthBarFill.style.backgroundColor = color;
            strengthText.textContent = text;
            strengthText.style.color = val.length > 0 ? color : 'var(--text-muted)';
        }
    });

    // Submeter Auth
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;
        const confirmPassword = (document.getElementById('auth-confirm-password') as HTMLInputElement).value;
        const name = (document.getElementById('auth-name') as HTMLInputElement).value;
        
        authError.style.display = 'none';
        authError.style.color = '#ef4444'; // Reseta cor para vermelho (erro padrão)
        
        // Validação de senhas no cadastro
        if (!isLoginMode && password !== confirmPassword) {
            authError.textContent = "As senhas não coincidem.";
            authError.style.display = 'block';
            return;
        }

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Aguarde...';

        try {
            if (supabaseUrl.includes("COLOQUE_SEU_PROJECT_REF")) {
                throw new Error("O Supabase não está configurado. Por favor, adicione as chaves no início do script.js");
            }

            let result;
            if (isLoginMode) {
                result = await supabase.auth.signInWithPassword({ email, password });
                if (result.error) throw result.error;
                authForm.reset();
            } else {
                result = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: { data: { name: name } }
                });
                
                if (result.error) throw result.error;

                // Desloga o usuário imediatamente após o cadastro para forçar o login manual
                await supabase.auth.signOut();
                
                // Limpa o form e muda para a aba de Login
                authForm.reset();
                document.querySelector('.auth-tab[data-action="login"]')?.dispatchEvent(new Event('click'));
                
                // Mostra mensagem de sucesso
                authError.style.color = '#10b981'; // Cor verde para sucesso
                authError.textContent = "Conta criada com sucesso! Por favor, faça o login.";
                authError.style.display = 'block';
                
                // Restaura o botão
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Entrar';
                return;
            }
        } catch (error) {
            authError.textContent = error.message || "Erro de autenticação";
            authError.style.display = 'block';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Criar Conta';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    // ==========================================
    // NOVA CONVERSA
    // ==========================================
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Gera um novo ID de sessão
            currentSessionId = crypto.randomUUID();
            
            // Adiciona a conversa atual na barra lateral se houver mensagens (simplificado)
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Nova Conversa</span>
            `;
            if (chatHistoryList) {
                // Remove active anterior
                document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
                historyItem.classList.add('active');
                chatHistoryList.prepend(historyItem);
            }

            // Limpa as mensagens atuais e volta à tela de boas-vindas
            messagesContainer.innerHTML = '';
            if (welcomeScreen) {
                welcomeScreen.style.display = 'flex';
                messagesContainer.appendChild(welcomeScreen);
            }
        });
    }

    // ==========================================
    // BANCO DE DADOS: WAREHOUSE E PROMPTS (Supabase)
    // ==========================================
    
    // Carregar Prompts Globais
    async function loadGlobalPrompts() {
        if (supabaseUrl.includes("COLOQUE_SEU_PROJECT_REF")) {
            wGlobalContent.innerHTML = '<div class="loading-prompts">Supabase não configurado. Adicione suas chaves no script.js.</div>';
            return;
        }

        try {
            const { data: prompts, error } = await supabase
                .from('warehouse_prompts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!prompts || prompts.length === 0) {
                wGlobalContent.innerHTML = '<div class="loading-prompts">Nenhum prompt global encontrado.</div>';
                return;
            }

            let html = '';
            // Agrupar por categoria
            const categories = {};
            prompts.forEach(prompt => {
                if (!categories[prompt.category]) categories[prompt.category] = [];
                categories[prompt.category].push(prompt);
            });

            for (const cat in categories) {
                html += `<div class="prompt-category"><h3>${escapeHTML(cat)}</h3><div class="prompt-grid">`;
                categories[cat].forEach(prompt => {
                    let adminActions = '';
                    if (userRole === 'admin') {
                        adminActions = `
                            <div class="prompt-card-actions">
                                <button class="use-prompt-btn" data-text="${escapeHTML(prompt.text)}" title="Usar no Chat">
                                    <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Usar
                                </button>
                                <button class="edit-prompt-btn" data-id="${prompt.id}" data-category="${escapeHTML(prompt.category)}" data-title="${escapeHTML(prompt.title)}" data-text="${escapeHTML(prompt.text)}" title="Ver / Editar">
                                    <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Editar
                                </button>
                                <button class="delete-prompt-btn delete-btn" data-id="${prompt.id}" title="Excluir">
                                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                                </button>
                            </div>
                        `;
                    } else {
                        adminActions = `
                            <div class="prompt-card-actions">
                                <button class="use-prompt-btn" data-text="${escapeHTML(prompt.text)}" title="Usar no Chat">
                                    <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Usar no Chat
                                </button>
                            </div>
                        `;
                    }
                    html += `
                        <div class="prompt-card" data-text="${escapeHTML(prompt.text)}" style="position:relative;">
                            <h4>${escapeHTML(prompt.title)}</h4>
                            <p>${escapeHTML(prompt.text).substring(0, 100)}...</p>
                            ${adminActions}
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
            wGlobalContent.innerHTML = html;
            
            // Renderizar icones Lucide
            if (window.lucide) {
                window.lucide.createIcons({
                    root: wGlobalContent
                });
            }

            // Adicionar eventos
            wGlobalContent.querySelectorAll('.use-prompt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = e.currentTarget as HTMLElement;
                    chatInput.value = target.dataset.text || '';
                    chatInput.dispatchEvent(new Event('input'));
                    chatInput.focus();
                });
            });

            // Eventos Admin (Editar/Excluir)
            wGlobalContent.querySelectorAll('.edit-prompt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = e.currentTarget as HTMLElement;
                    document.getElementById('add-prompt-id').value = target.dataset.id;
                    document.getElementById('add-prompt-category').value = target.dataset.category;
                    document.getElementById('add-prompt-title').value = target.dataset.title;
                    
                    // Extrair partes com a nova função robusta
                    const rawText = target.dataset.text || '';
                    const parsed = parsePromptSections(rawText);

                    document.getElementById('add-prompt-initial').value = parsed.initial;
                    document.getElementById('add-prompt-instructions').value = parsed.instructions;
                    document.getElementById('add-prompt-final').value = parsed.final;
                    
                    document.getElementById('modal-prompt-title').innerText = 'Editar Prompt';
                    document.getElementById('add-prompt-modal').classList.add('active');
                });
            });

            wGlobalContent.querySelectorAll('.delete-prompt-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Deseja realmente excluir este prompt global?')) return;
                    
                    const target = e.currentTarget as HTMLElement;
                    const id = target.dataset.id;
                    
                    try {
                        const { data, error } = await supabase.from('warehouse_prompts').delete().eq('id', id).select();
                        if (error) throw error;
                        
                        if (!data || data.length === 0) {
                            alert('Erro: O prompt não foi excluído. Verifique se as Políticas de Segurança (RLS) da tabela "warehouse_prompts" no Supabase permitem a operação de DELETE para o seu usuário.');
                            return;
                        }
                        
                        loadGlobalPrompts();
                    } catch (err) {
                        console.error('Erro ao deletar:', err);
                        alert('Erro ao excluir prompt.');
                    }
                });
            });

        } catch (error) {
            console.error("Erro ao carregar prompts globais:", error);
            wGlobalContent.innerHTML = '<div class="loading-prompts">Erro ao carregar prompts globais.</div>';
        }
    }

    // Carregar Meus Prompts
    async function loadMyPrompts() {
        if (!currentUser) return;
        
        try {
            const { data: prompts, error } = await supabase
                .from('saved_prompts')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!prompts || prompts.length === 0) {
                wMyPromptsContent.innerHTML = '<div class="loading-prompts">Você ainda não salvou nenhum prompt.</div>';
                return;
            }

            let html = '<div class="prompt-grid" style="margin-top: 10px;">';
            prompts.forEach(prompt => {
                const actions = `
                    <div class="prompt-card-actions">
                        <button class="use-prompt-btn" data-text="${escapeHTML(prompt.text)}" title="Usar no Chat">
                            <i data-lucide="message-square" style="width: 14px; height: 14px;"></i> Usar
                        </button>
                        <button class="edit-my-prompt-btn" data-id="${prompt.id}" data-title="${escapeHTML(prompt.title)}" data-text="${escapeHTML(prompt.text)}" title="Abrir / Editar">
                            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Editar
                        </button>
                        <button class="delete-my-prompt-btn delete-btn" data-id="${prompt.id}" title="Excluir">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `;
                html += `
                    <div class="prompt-card" data-text="${escapeHTML(prompt.text)}" style="position:relative;">
                        <h4>${escapeHTML(prompt.title)}</h4>
                        <p>${escapeHTML(prompt.text).substring(0, 100)}...</p>
                        ${actions}
                    </div>
                `;
            });
            html += '</div>';
            wMyPromptsContent.innerHTML = html;

            if (window.lucide) {
                window.lucide.createIcons({
                    root: wMyPromptsContent
                });
            }

            wMyPromptsContent.querySelectorAll('.use-prompt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = e.currentTarget as HTMLElement;
                    chatInput.value = target.dataset.text || '';
                    chatInput.dispatchEvent(new Event('input'));
                    chatInput.focus();
                });
            });

            wMyPromptsContent.querySelectorAll('.edit-my-prompt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = e.currentTarget as HTMLElement;
                    document.getElementById('add-prompt-id').value = target.dataset.id;
                    document.getElementById('add-prompt-category').value = ''; // Meus prompts não têm categoria exibida fortemente, mas pode ser deixado em branco
                    document.getElementById('add-prompt-category').parentElement.style.display = 'none'; // Esconde o campo categoria
                    document.getElementById('add-prompt-title').value = target.dataset.title;
                    
                    const rawText = target.dataset.text || '';
                    const parsed = parsePromptSections(rawText);

                    (document.getElementById('add-prompt-initial') as HTMLTextAreaElement).value = parsed.initial;
                    (document.getElementById('add-prompt-instructions') as HTMLTextAreaElement).value = parsed.instructions;
                    (document.getElementById('add-prompt-final') as HTMLTextAreaElement).value = parsed.final;
                    
                    document.getElementById('modal-prompt-title').innerText = 'Editar Meu Prompt';
                    document.getElementById('add-prompt-modal').classList.add('active');
                });
            });

            wMyPromptsContent.querySelectorAll('.delete-my-prompt-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Deseja realmente excluir este prompt?')) return;
                    
                    const target = e.currentTarget as HTMLElement;
                    const id = target.dataset.id;
                    
                    try {
                        const { data, error } = await supabase.from('saved_prompts').delete().eq('id', id).select();
                        if (error) throw error;
                        if (!data || data.length === 0) {
                            alert('A exclusão falhou silenciosamente. Você precisa acessar o Supabase, ir em "Authentication" > "Policies" (ou "Table Editor" > "RLS") e adicionar uma política que permita a operação DELETE na tabela saved_prompts!');
                        } else {
                            loadMyPrompts();
                        }
                    } catch (err) {
                        console.error('Erro ao deletar:', err);
                        alert('Erro ao excluir prompt.');
                    }
                });
            });

        } catch (error) {
            console.error("Erro ao carregar meus prompts:", error);
            wMyPromptsContent.innerHTML = '<div class="loading-prompts" style="color:#ef4444;">Erro ao carregar seus prompts.</div>';
        }
    }

    // Salvar Prompt (Ação do aluno)
    window.savePromptToDB = async function(title, text, btnElement) {
        if (!currentUser) {
            alert("Você precisa fazer login para salvar prompts!");
            loginPage.style.display = 'flex';
            appContainer.style.display = 'none';
            return;
        }

        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = 'Salvando...';
        btnElement.disabled = true;

        try {
            const { error } = await supabase.from('saved_prompts').insert([
                {
                    user_id: currentUser.id,
                    title: title.trim(),
                    text: text.trim()
                }
            ]);

            if (error) throw error;
            
            btnElement.innerHTML = '✓ Salvo';
            btnElement.style.color = '#10b981';
            loadMyPrompts(); // Atualiza a lista em background
            
            setTimeout(() => {
                btnElement.innerHTML = originalHtml;
                btnElement.style.color = '';
                btnElement.disabled = false;
            }, 2000);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            btnElement.innerHTML = '! Erro';
            btnElement.style.color = '#ef4444';
            setTimeout(() => {
                btnElement.innerHTML = originalHtml;
                btnElement.style.color = '';
                btnElement.disabled = false;
            }, 2000);
        }
    };

    // ==========================================
    // LOGICA DOS MODAIS (UI Events)
    // ==========================================

    // (Old Warehouse Modal listeners removed because Warehouse is now a sidebar)

    // Warehouse Tabs
    wTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            wTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.dataset.target;
            wGlobalContent.style.display = targetId === 'warehouse-content-global' ? 'flex' : 'none';
            wMyPromptsContent.style.display = targetId === 'warehouse-content-my-prompts' ? 'flex' : 'none';

            // Visibilidade do botão de adicionar prompt
            if (targetId === 'warehouse-content-global') {
                addPromptBtn.style.display = userRole === 'admin' ? 'flex' : 'none';
            } else {
                addPromptBtn.style.display = currentUser ? 'flex' : 'none';
            }
        });
    });

    // Abrir Add Prompt
    addPromptBtn.addEventListener('click', () => {
        document.getElementById('add-prompt-id').value = '';
        addPromptForm.reset();
        
        // Mantém a categoria sempre visível, para o usuário organizar melhor, mesmo nos Meus Prompts
        const categoryGroup = document.getElementById('add-prompt-category').parentElement;
        categoryGroup.style.display = 'block';

        document.getElementById('modal-prompt-title').innerText = 'Adicionar Novo Prompt';
        addPromptModal.classList.add('active');
    });
    
    // Recolher da conversa
    const fetchFromChatBtn = document.getElementById('fetch-from-chat-btn');
    if (fetchFromChatBtn) {
        fetchFromChatBtn.addEventListener('click', () => {
            // Pega as mensagens da IA que tem custom-boxes
            const aiMessages = Array.from(document.querySelectorAll('.messages-container .ai-message')).filter(m => m.querySelector('.custom-box'));
            if (aiMessages.length === 0) {
                alert('Nenhum prompt formatado (com balões) foi encontrado na conversa atual.');
                return;
            }
            
            const lastMessage = aiMessages[aiMessages.length - 1] as HTMLElement;
            const boxes = lastMessage.querySelectorAll('.custom-box');
            
            let initial = '', instructions = '', final = '', title = '';
            
            boxes.forEach(box => {
                const headerSpan = box.querySelector('.box-header span') as HTMLElement;
                const contentDiv = box.querySelector('.box-content') as HTMLElement;
                if (!headerSpan || !contentDiv) return;
                
                const headerText = headerSpan.innerText.toLowerCase();
                const contentText = contentDiv.innerText.trim();
                
                if (headerText.includes('inicial')) {
                    initial = contentText;
                } else if (headerText.includes('roteiro') || headerText.includes('instruç') || headerText.includes('conceito')) {
                    instructions = contentText;
                } else if (headerText.includes('final')) {
                    final = contentText;
                }
            });

            (document.getElementById('add-prompt-initial') as HTMLTextAreaElement).value = initial;
            (document.getElementById('add-prompt-instructions') as HTMLTextAreaElement).value = instructions;
            (document.getElementById('add-prompt-final') as HTMLTextAreaElement).value = final;
            
            // O título será preenchido pelo próprio usuário
            (document.getElementById('add-prompt-title') as HTMLInputElement).value = '';
        });
    }

    closeAddPromptBtn.addEventListener('click', () => {
        addPromptModal.classList.remove('active');
    });

    // Copiar campo específico no modal
    document.querySelectorAll('.copy-field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = (e.currentTarget as HTMLElement).dataset.target;
            const textToCopy = (document.getElementById(targetId) as HTMLTextAreaElement).value;
            
            if (!textToCopy) return;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHtml = (e.currentTarget as HTMLElement).innerHTML;
                (e.currentTarget as HTMLElement).innerHTML = '<span style="font-size: 11px; margin-right: 4px;">Copiado!</span> <i data-lucide="check" style="width: 14px; height: 14px; color: #10b981;"></i>';
                if (window.lucide) window.lucide.createIcons({ root: e.currentTarget as HTMLElement });
                
                setTimeout(() => {
                    (e.currentTarget as HTMLElement).innerHTML = originalHtml;
                    if (window.lucide) window.lucide.createIcons({ root: e.currentTarget as HTMLElement });
                }, 2000);
            });
        });
    });

    // Submeter Novo Prompt / Editar
    addPromptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Verifica se está na aba global e é admin, ou aba meus prompts
        const isGlobal = document.querySelector('.w-tab.active').dataset.target === 'warehouse-content-global';
        if (isGlobal && userRole !== 'admin') return;

        const id = document.getElementById('add-prompt-id').value;
        const category = document.getElementById('add-prompt-category').value;
        const title = document.getElementById('add-prompt-title').value;
        const initial = document.getElementById('add-prompt-initial').value.trim();
        const instructions = document.getElementById('add-prompt-instructions').value.trim();
        const final = document.getElementById('add-prompt-final').value.trim();

        // Montar texto estruturado
        let formattedText = '';
        if (initial) formattedText += `**Prompt Inicial:**\n${initial}\n\n`;
        if (instructions) formattedText += `**Roteiro e Instruções:**\n${instructions}\n\n`;
        if (final) formattedText += `**Prompt Final:**\n${final}`;
        
        // Fallback caso usuário preencha de forma antiga (fallback para quando só tinha textarea, não mais necessário mas previne erros)
        if (!formattedText.trim()) formattedText = title;

        const btn = addPromptForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const tableName = isGlobal ? 'warehouse_prompts' : 'saved_prompts';
            const payload: any = { title: title, text: formattedText.trim() };
            if (isGlobal) {
                payload.category = category;
            } else {
                payload.user_id = currentUser.id;
                payload.category = category; // Tentamos enviar a categoria
            }

            try {
                if (id) {
                    const { error } = await supabase.from(tableName).update(payload).eq('id', id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from(tableName).insert([payload]);
                    if (error) throw error;
                }
            } catch (initialError) {
                // Se der erro de coluna não encontrada para 'category' em saved_prompts, tentamos sem ela
                if (!isGlobal && initialError.message && initialError.message.includes('category')) {
                    console.warn("Coluna category ausente. Salvando sem categoria.");
                    delete payload.category;
                    if (id) {
                        const { error } = await supabase.from(tableName).update(payload).eq('id', id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from(tableName).insert([payload]);
                        if (error) throw error;
                    }
                    alert("Aviso: O prompt foi salvo, mas a tabela 'saved_prompts' no Supabase não possui a coluna 'category'. Crie essa coluna (tipo text) no seu Supabase para as categorias funcionarem nos Meus Prompts!");
                } else {
                    throw initialError;
                }
            }

            addPromptModal.classList.remove('active');
            addPromptForm.reset();
            
            if (isGlobal) loadGlobalPrompts();
            else loadMyPrompts();

        } catch (error) {
            console.error("Erro ao salvar prompt:", error);
            alert("Erro ao salvar prompt: " + (error.message || JSON.stringify(error)));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar Prompt';
        }
    });


    // ==========================================
    // LOGICA DO CHAT 
    // ==========================================

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);



    // Fechar modais ao clicar fora (somente para Warehouse e Add Prompt)
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Handle Copy e Save Buttons inside AI Responses
    messagesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (btn) {
            const boxContent = btn.closest('.custom-box').querySelector('.box-content');
            const textToCopy = boxContent.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '✓ Copiado';
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.style.color = '';
                }, 2000);
            });
        }

        const saveBtn = e.target.closest('.save-prompt-btn');
        if (saveBtn) {
            const aiMessage = saveBtn.closest('.ai-message');
            const boxes = aiMessage.querySelectorAll('.custom-box');
            
            let initial = '', instructions = '', final = '', title = '';
            
            boxes.forEach(box => {
                const headerSpan = box.querySelector('.box-header span') as HTMLElement;
                const contentDiv = box.querySelector('.box-content') as HTMLElement;
                if (!headerSpan || !contentDiv) return;
                
                const headerText = headerSpan.innerText.toLowerCase();
                const contentText = contentDiv.innerText.trim();
                
                if (headerText.includes('inicial')) {
                    initial = contentText;
                } else if (headerText.includes('roteiro') || headerText.includes('instruç') || headerText.includes('conceito')) {
                    instructions = contentText;
                } else if (headerText.includes('final')) {
                    final = contentText;
                }
            });
            
            // Em vez de salvar direto, abre o modal preenchido para o usuário revisar
            document.getElementById('add-prompt-id').value = '';
            document.getElementById('add-prompt-category').value = '';
            document.getElementById('add-prompt-category').parentElement.style.display = 'block'; // Sempre visível
            
            // O título fica em branco para a pessoa preencher
            (document.getElementById('add-prompt-title') as HTMLInputElement).value = '';

            (document.getElementById('add-prompt-initial') as HTMLTextAreaElement).value = initial;
            (document.getElementById('add-prompt-instructions') as HTMLTextAreaElement).value = instructions;
            (document.getElementById('add-prompt-final') as HTMLTextAreaElement).value = final;
            
            document.getElementById('modal-prompt-title').innerText = 'Salvar Novo Prompt';
            
            // Certificar que aba "Meus Prompts" está selecionada no background,
            // para que ao salvar vá para a tabela certa
            document.querySelector('.w-tab[data-target="warehouse-content-my-prompts"]').click();
            
            document.getElementById('add-prompt-modal').classList.add('active');
        }
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (text.length === 0) return;
        
        const currentWelcomeScreen = document.querySelector('.welcome-screen') as HTMLElement;
        if (currentWelcomeScreen) currentWelcomeScreen.style.display = 'none';

        appendUserMessage(text);
        await saveUserMessage(text); // Chama nossa nova função

        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');
        scrollToBottom();
        getAIResponse(text);
    }

    function appendUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        const avatarUrl = currentUser ? `https://ui-avatars.com/api/?name=${currentUser.email}&background=6366f1&color=fff` : 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff';
        avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="User" style="width:32px;height:32px;border-radius:8px;">`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `<p>${escapeHTML(text)}</p>`;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        messagesContainer.appendChild(messageDiv);
    }

    async function getAIResponse(userText) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-container';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <div class="logo-icon-small">M</div>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();

        try {
            const response = await fetch('https://hook.us2.make.com/rascfcpxalgwr281qror9lxlrzmk22au', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    aluno_id: alunoId,
                    sessao_id: currentSessionId, // Envia o ID único da conversa para manter histórico
                    mensagem: userText
                })
            });

            if (!response.ok) throw new Error('Erro na comunicação');

            let responseText = '';
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                responseText = data.response || data.message || data.text || JSON.stringify(data);
            } else {
                responseText = await response.text();
            }

            if (!responseText || responseText.trim() === 'Accepted') {
                responseText = "Mensagem recebida com sucesso pelo sistema!";
            }

            // Salvar resposta da IA no banco
            if (currentUser) {
                await supabase.from('chat_messages').insert([
                    { session_id: currentSessionId, role: 'ai', content: responseText }
                ]);
            }

            typingDiv.remove();
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'message ai-message';
            responseDiv.innerHTML = `
                <div class="message-avatar">
                    <div class="logo-icon-small">M</div>
                </div>
                <div class="message-content">
                    ${formatAIResponse(responseText)}
                </div>
            `;
            messagesContainer.appendChild(responseDiv);
            scrollToBottom();

        } catch (error) {
            console.error('Webhook error:', error);
            typingDiv.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message ai-message';
            errorDiv.innerHTML = `
                <div class="message-avatar">
                    <div class="logo-icon-small" style="background: #ef4444;">!</div>
                </div>
                <div class="message-content">
                    <p style="color: #ef4444;">Desculpe, ocorreu um erro ao conectar com o servidor. Tente novamente.</p>
                </div>
            `;
            messagesContainer.appendChild(errorDiv);
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatAIResponse(text) {
        const inicialRegex = /[\*#]*\s*(Prompt\s*(?:Frame\s*)?Inicial)[\s:*#\-]*/gi;
        const finalRegex = /[\*#]*\s*(Prompt\s*(?:Frame\s*)?Final|Frame\s*Final|Comando\s*Final)[\s:*#\-]*/gi;
        const roteiroRegex = /[\*#]*\s*(Roteiro(?: e Instruções)?|Instruções|Conceito)[\s:*#\-]*/gi;
        
        if (inicialRegex.test(text) || roteiroRegex.test(text)) {
            let safeText = escapeHTML(text);
            
            safeText = safeText.replace(/[\*#]*\s*(Prompt\s*(?:Frame\s*)?Inicial)[\s:*#\-]*\n?/gi, "|||PROMPT_INICIAL:$1|||");
            safeText = safeText.replace(/[\*#]*\s*(Prompt\s*(?:Frame\s*)?Final|Frame\s*Final|Comando\s*Final)[\s:*#\-]*\n?/gi, "|||PROMPT_FINAL:$1|||");
            safeText = safeText.replace(/[\*#]*\s*(Roteiro(?: e Instruções)?|Instruções|Conceito)[\s:*#\-]*\n?/gi, "|||ROTEIRO:$1|||");
            
            const parts = safeText.split(/\|\|\|/);
            let formattedHtml = '';
            
            const copyBtn = `<button class="copy-btn" title="Copiar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar</button>`;
            const saveBtn = `<button class="save-prompt-btn" title="Salvar em Meus Prompts"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvar</button>`;

            const actionButtons = `<div style="display:flex;">${copyBtn}${saveBtn}</div>`;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!part.trim()) continue;
                
                if (part.startsWith("PROMPT_INICIAL:")) {
                    const title = part.split(":")[1];
                    if (formattedHtml.includes('<div class="custom-box')) formattedHtml += '</div></div>';
                    formattedHtml += `<div class="custom-box prompt-box"><div class="box-header"><span>✨ ${title}</span>${actionButtons}</div><div class="box-content">`;
                } else if (part.startsWith("PROMPT_FINAL:")) {
                    const title = part.split(":")[1];
                    if (formattedHtml.includes('<div class="custom-box')) formattedHtml += '</div></div>';
                    formattedHtml += `<div class="custom-box prompt-box"><div class="box-header"><span>🎯 ${title}</span>${actionButtons}</div><div class="box-content">`;
                } else if (part.startsWith("ROTEIRO:")) {
                    const title = part.split(":")[1];
                    if (formattedHtml.includes('<div class="custom-box')) formattedHtml += '</div></div>';
                    formattedHtml += `<div class="custom-box script-box"><div class="box-header"><span>🎬 ${title}</span>${actionButtons}</div><div class="box-content">`;
                } else {
                    let content = part.trim().replace(/\n/g, '<br>');
                    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    if (i === 0 && !formattedHtml.includes('<div class="custom-box')) {
                        formattedHtml += '<p>' + content + '</p>';
                    } else {
                        formattedHtml += content;
                    }
                }
            }
            if (formattedHtml.includes('<div class="custom-box')) formattedHtml += '</div></div>';
            return formattedHtml;
        }
        
        let defaultContent = escapeHTML(text).replace(/\n/g, '<br>');
        defaultContent = defaultContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<p>${defaultContent}</p>`;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================
    // GERENCIAMENTO DE CONVERSAS (SUPABASE)
    // ==========================================
    
    async function saveUserMessage(text) {
        if (!currentUser) return;
        // Verifica se a sessão existe, se não, cria
        const { data: sessionData } = await supabase.from('chat_sessions').select('id').eq('id', currentSessionId).single();
        if (!sessionData) {
            await supabase.from('chat_sessions').insert([
                { id: currentSessionId, user_id: currentUser.id, title: text.substring(0, 30) + '...' }
            ]);
            loadSessions(); // Recarrega barra lateral
        }
        await supabase.from('chat_messages').insert([
            { session_id: currentSessionId, role: 'user', content: text }
        ]);
    }

    async function loadSessions() {
        if (!currentUser || !chatHistoryList) return;
        const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Erro ao carregar sessões:", error);
            return;
        }

        chatHistoryList.innerHTML = '';
        sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;
            item.innerHTML = `
                <div class="history-item-content">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${session.is_pinned ? '#3b82f6' : 'currentColor'}" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>${escapeHTML(session.title)}</span>
                </div>
                <div class="history-actions">
                    <button class="h-action-btn pin-btn" title="Fixar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
                    <button class="h-action-btn rename-btn" title="Renomear"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg></button>
                    <button class="h-action-btn delete-btn" title="Apagar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            `;
            
            // Trocar de sessão
            item.querySelector('.history-item-content').addEventListener('click', () => loadChatHistory(session.id));
            
            // Fixar
            item.querySelector('.pin-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await supabase.from('chat_sessions').update({ is_pinned: !session.is_pinned }).eq('id', session.id);
                loadSessions();
            });

            // Renomear
            item.querySelector('.rename-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const newTitle = prompt("Novo nome da conversa:", session.title);
                if (newTitle && newTitle.trim()) {
                    await supabase.from('chat_sessions').update({ title: newTitle.trim() }).eq('id', session.id);
                    loadSessions();
                }
            });

            // Apagar
            item.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm("Tem certeza que deseja apagar esta conversa?")) {
                    await supabase.from('chat_sessions').delete().eq('id', session.id);
                    if (currentSessionId === session.id) {
                        newChatBtn.click();
                    } else {
                        loadSessions();
                    }
                }
            });

            chatHistoryList.appendChild(item);
        });
    }

    async function loadChatHistory(sessionId) {
        currentSessionId = sessionId;
        loadSessions(); // Atualiza UI active
        messagesContainer.innerHTML = '';
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (messages) {
            messages.forEach(msg => {
                if (msg.role === 'user') {
                    appendUserMessage(msg.content);
                } else {
                    const responseDiv = document.createElement('div');
                    responseDiv.className = 'message ai-message';
                    responseDiv.innerHTML = `
                        <div class="message-avatar">
                            <div class="logo-icon-small">M</div>
                        </div>
                        <div class="message-content">
                            ${formatAIResponse(msg.content)}
                        </div>
                    `;
                    messagesContainer.appendChild(responseDiv);
                }
            });
            scrollToBottom();
        }
    }

    // Carregar sessões logo após o login
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            setTimeout(loadSessions, 500);
        }
    });

    // ==========================================
    // PROCESSING SCREEN (CANVAS GLITCH E LOADER)
    // ==========================================
    const processingPage = document.getElementById('processing-page');
    const processingStatusText = document.getElementById('processing-status-text');
    const asciiPercentageText = document.getElementById('ascii-percentage-text');
    const asciiBars = document.getElementById('ascii-bars');
    const processingPercentage = document.getElementById('processing-percentage');
    const glitchCanvas = document.getElementById('glitch-canvas') as HTMLCanvasElement;
    
    function startLetterGlitch() {
        if (!glitchCanvas) return () => {};
        const ctx = glitchCanvas.getContext('2d');
        if (!ctx) return () => {};
        
        let animationFrameId: number;
        let lastGlitchTime = Date.now();
        const glitchSpeed = 50;
        const characters = '.,:;-*#';
        const colors = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
        
        const fontSize = 16;
        const charWidth = 10;
        const charHeight = 20;
        
        let grid = { columns: 0, rows: 0 };
        let letters: any[] = [];
        
        function resizeCanvas() {
            const parent = glitchCanvas.parentElement;
            if (!parent) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = parent.getBoundingClientRect();
            glitchCanvas.width = rect.width * dpr;
            glitchCanvas.height = rect.height * dpr;
            glitchCanvas.style.width = `${rect.width}px`;
            glitchCanvas.style.height = `${rect.height}px`;
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            
            grid.columns = Math.ceil(rect.width / charWidth);
            grid.rows = Math.ceil(rect.height / charHeight);
            
            letters = Array.from({ length: grid.columns * grid.rows }, () => ({
                char: characters[Math.floor(Math.random() * characters.length)],
                color: colors[Math.floor(Math.random() * colors.length)],
            }));
            drawLetters();
        }
        
        function drawLetters() {
            const parent = glitchCanvas.parentElement;
            if (!parent) return;
            const { width, height } = parent.getBoundingClientRect();
            ctx!.clearRect(0, 0, width, height);
            ctx!.font = `${fontSize}px monospace`;
            ctx!.textBaseline = 'top';
            
            letters.forEach((letter, index) => {
                const x = (index % grid.columns) * charWidth;
                const y = Math.floor(index / grid.columns) * charHeight;
                ctx!.fillStyle = letter.color;
                ctx!.fillText(letter.char, x, y);
            });
        }
        
        function animate() {
            const now = Date.now();
            if (now - lastGlitchTime >= glitchSpeed) {
                const updateCount = Math.max(1, Math.floor(letters.length * 0.05));
                for (let i = 0; i < updateCount; i++) {
                    const idx = Math.floor(Math.random() * letters.length);
                    if (letters[idx]) {
                        letters[idx].char = characters[Math.floor(Math.random() * characters.length)];
                        letters[idx].color = colors[Math.floor(Math.random() * colors.length)];
                    }
                }
                drawLetters();
                lastGlitchTime = now;
            }
            animationFrameId = requestAnimationFrame(animate);
        }
        
        resizeCanvas();
        animate();
        
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }
    
    async function runProcessingScreen() {
        if (!processingPage) {
            appContainer.style.display = 'flex';
            return;
        }
        
        loginPage.style.display = 'none';
        processingPage.style.display = 'flex';
        appContainer.style.display = 'none';
        
        const stopGlitch = startLetterGlitch();
        
        const stages = [
          { key: 'initializing', label: 'Iniciando ambiente de criação rápido...', minProgress: 0 },
          { key: 'analyzing', label: 'Carregando biblioteca do Método Motion IA...', minProgress: 10 },
          { key: 'generating', label: 'Sincronizando seus prompts armazenados...', minProgress: 30 },
          { key: 'validating', label: 'Otimizando ferramentas de IA...', minProgress: 70 },
          { key: 'optimizing', label: 'Preparando interface de alta conversão...', minProgress: 85 },
          { key: 'finalizing', label: 'Tudo pronto para inovar!', minProgress: 95 }
        ];
        
        let currentProgress = 0;
        
        return new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                currentProgress += Math.random() * 3 + 1.5; // Aproximadamente 2-3 segundos para carregar
                if (currentProgress > 100) currentProgress = 100;
                
                const roundedProgress = Math.round(currentProgress);
                
                // Update Texts
                if (processingPercentage) processingPercentage.textContent = `${roundedProgress}%`;
                if (asciiPercentageText) asciiPercentageText.textContent = `${roundedProgress}%`;
                
                // Update Ascii Bars
                if (asciiBars) {
                    const totalBars = 20;
                    const filledBars = Math.floor((roundedProgress / 100) * totalBars);
                    let barsHtml = '';
                    for (let i = 0; i < totalBars; i++) {
                        if (i < filledBars) {
                            barsHtml += `<span style="color: #3b82f6;">▓</span>`;
                        } else {
                            barsHtml += `<span style="color: rgba(255,255,255,0.2);">░</span>`;
                        }
                    }
                    asciiBars.innerHTML = barsHtml;
                }
                
                // Update Stage Text
                let currentStage = stages[0];
                for (let i = stages.length - 1; i >= 0; i--) {
                    if (roundedProgress >= stages[i].minProgress) {
                        currentStage = stages[i];
                        break;
                    }
                }
                if (processingStatusText && processingStatusText.textContent !== currentStage.label) {
                    processingStatusText.style.opacity = '0';
                    setTimeout(() => {
                        processingStatusText.textContent = roundedProgress === 100 ? 'Done. Leads qualified, routed, answered.' : currentStage.label;
                        processingStatusText.style.opacity = '1';
                    }, 150);
                }
                
                if (currentProgress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        if (stopGlitch) stopGlitch();
                        const dashboardContainer = document.getElementById('dashboard-container');
                        processingPage.style.display = 'none';
                        if (dashboardContainer) dashboardContainer.style.display = 'flex';
                        sessionStorage.setItem('hasSeenLoading', 'true');
                        resolve();
                    }, 800); // 0.8s of 100%
                }
            }, 60);
        });
    }

    // ==========================================
    // SISTEMA DE SUPORTE (Mock com LocalStorage)
    // ==========================================
    
    // UI Elements
    const supportWidgetBtn = document.getElementById('support-widget-btn');
    const supportChatWindow = document.getElementById('support-chat-window');
    const supportIconOpen = document.querySelector('.support-icon-open');
    const supportIconClose = document.querySelector('.support-icon-close');
    const supportChatBody = document.getElementById('support-chat-body');
    const supportChatInput = document.getElementById('support-chat-input-field') as HTMLInputElement;
    const supportSendBtn = document.getElementById('support-send-btn');
    
    const adminSupportBtn = document.getElementById('admin-support-btn');
    const adminSupportModal = document.getElementById('admin-support-modal');
    const closeAdminSupportBtn = document.getElementById('close-admin-support-btn');
    const adminTicketsList = document.getElementById('admin-tickets-list');
    const adminActiveChatBody = document.getElementById('admin-active-chat-body');
    const adminChatReplyInput = document.getElementById('admin-chat-reply-input') as HTMLInputElement;
    const adminChatReplyBtn = document.getElementById('admin-chat-reply-btn') as HTMLButtonElement;
    const adminActiveUserName = document.getElementById('admin-active-user-name');
    const adminActiveUserEmail = document.getElementById('admin-active-user-email');
    const adminActiveUserAvatar = document.getElementById('admin-active-user-avatar');

    let activeAdminTicketId: string | null = null;
    let supportPollingInterval: number | null = null;
    let memoryTickets: Record<string, any> = {};

    // Helper: Busca todos os tickets do Supabase
    async function refreshTicketsFromSupabase() {
        if (!supabase) return;
        const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
        if (data) {
            memoryTickets = {};
            data.forEach(t => {
                memoryTickets[t.user_id] = {
                    userId: t.user_id,
                    email: t.user_email,
                    name: t.user_name,
                    messages: t.messages
                };
            });
        }
    }

    // Helper: Salva ticket no Supabase
    async function saveTicketToSupabase(ticket: any) {
        if (!supabase) return;
        await supabase.from('support_tickets').upsert({
            user_id: ticket.userId,
            user_email: ticket.email,
            user_name: ticket.name,
            messages: ticket.messages,
            updated_at: new Date().toISOString()
        });
    }

    // User: Toggle Widget
    if (supportWidgetBtn) {
        supportWidgetBtn.addEventListener('click', async () => {
            const isClosed = supportChatWindow?.style.display === 'none' || supportChatWindow?.style.display === '';
            if (isClosed) {
                if (supportChatWindow) supportChatWindow.style.display = 'flex';
                if (supportIconOpen) (supportIconOpen as HTMLElement).style.display = 'none';
                if (supportIconClose) (supportIconClose as HTMLElement).style.display = 'block';
                await loadUserMessages();
                // Polling for new messages
                if (supportPollingInterval) clearInterval(supportPollingInterval);
                supportPollingInterval = window.setInterval(loadUserMessages, 3000);
            } else {
                if (supportChatWindow) supportChatWindow.style.display = 'none';
                if (supportIconOpen) (supportIconOpen as HTMLElement).style.display = 'block';
                if (supportIconClose) (supportIconClose as HTMLElement).style.display = 'none';
                if (supportPollingInterval) clearInterval(supportPollingInterval);
            }
        });
    }

    // User: Send Message
    async function sendUserSupportMessage() {
        if (!currentUser) return;
        const text = supportChatInput?.value.trim();
        if (!text) return;

        if (!memoryTickets[currentUser.id]) {
            memoryTickets[currentUser.id] = {
                userId: currentUser.id,
                email: currentUser.email,
                name: currentUser.email?.split('@')[0] || 'Usuário',
                messages: []
            };
        }
        
        memoryTickets[currentUser.id].messages.push({
            sender: 'user',
            text: text,
            timestamp: Date.now()
        });
        
        if (supportChatInput) supportChatInput.value = '';
        renderUserMessages(); // Update UI immediately (optimistic)
        
        await saveTicketToSupabase(memoryTickets[currentUser.id]);
    }

    if (supportSendBtn) {
        supportSendBtn.addEventListener('click', sendUserSupportMessage);
    }
    if (supportChatInput) {
        supportChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendUserSupportMessage();
        });
    }

    async function loadUserMessages() {
        if (!currentUser || !supportChatBody) return;
        await refreshTicketsFromSupabase();
        renderUserMessages();
    }

    function renderUserMessages() {
        if (!currentUser || !supportChatBody) return;
        const myTicket = memoryTickets[currentUser.id];
        
        supportChatBody.innerHTML = '';
        
        // Mensagem padrão inicial
        const defaultMsg = document.createElement('div');
        defaultMsg.className = 'support-message support-admin-msg';
        defaultMsg.innerHTML = '<p>Olá! Como podemos ajudar você hoje?</p>';
        supportChatBody.appendChild(defaultMsg);

        if (myTicket && myTicket.messages) {
            myTicket.messages.forEach((msg: any) => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `support-message ${msg.sender === 'user' ? 'support-user-msg' : 'support-admin-msg'}`;
                msgDiv.innerHTML = `<p>${msg.text}</p>`;
                supportChatBody.appendChild(msgDiv);
            });
        }
        
        supportChatBody.scrollTop = supportChatBody.scrollHeight;
    }

    // Admin: Open Modal
    if (adminSupportBtn) {
        adminSupportBtn.addEventListener('click', async () => {
            if (adminSupportModal) adminSupportModal.classList.add('active');
            await refreshAdminView();
            // Polling for admin
            if (supportPollingInterval) clearInterval(supportPollingInterval);
            supportPollingInterval = window.setInterval(refreshAdminView, 3000);
        });
    }

    // Admin: Close Modal
    if (closeAdminSupportBtn) {
        closeAdminSupportBtn.addEventListener('click', () => {
            if (adminSupportModal) adminSupportModal.classList.remove('active');
            if (supportPollingInterval) clearInterval(supportPollingInterval);
        });
    }

    async function refreshAdminView() {
        await refreshTicketsFromSupabase();
        loadAdminTickets();
        if (activeAdminTicketId) {
            loadAdminChat(activeAdminTicketId);
        }
    }

    function loadAdminTickets() {
        if (!adminTicketsList) return;
        const ticketIds = Object.keys(memoryTickets);
        
        if (ticketIds.length === 0) {
            adminTicketsList.innerHTML = '<div class="empty-state">Nenhuma conversa ativa no momento.</div>';
            return;
        }

        let html = '';
        ticketIds.forEach(id => {
            const t = memoryTickets[id];
            const lastMsg = t.messages.length > 0 ? t.messages[t.messages.length - 1].text : '';
            const isActive = activeAdminTicketId === id ? 'active' : '';
            html += `
                <div class="admin-ticket-item ${isActive}" data-id="${id}">
                    <h4>${t.name}</h4>
                    <p>${lastMsg || 'Novo ticket...'}</p>
                </div>
            `;
        });
        
        adminTicketsList.innerHTML = html;
        
        const items = adminTicketsList.querySelectorAll('.admin-ticket-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) {
                    activeAdminTicketId = id;
                    loadAdminChat(id);
                    // Update active class
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });
    }

    function loadAdminChat(ticketId: string) {
        const ticket = memoryTickets[ticketId];
        if (!ticket || !adminActiveChatBody) return;

        if (adminActiveUserName) adminActiveUserName.textContent = ticket.name;
        if (adminActiveUserEmail) adminActiveUserEmail.textContent = ticket.email;
        if (adminActiveUserAvatar) adminActiveUserAvatar.textContent = ticket.name.charAt(0).toUpperCase();
        
        if (adminChatReplyInput) adminChatReplyInput.disabled = false;
        if (adminChatReplyBtn) adminChatReplyBtn.disabled = false;

        adminActiveChatBody.innerHTML = '';
        
        ticket.messages.forEach((msg: any) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `admin-chat-msg ${msg.sender === 'admin' ? 'admin' : 'user'}`;
            msgDiv.innerHTML = `${msg.text}`;
            adminActiveChatBody.appendChild(msgDiv);
        });
        
        adminActiveChatBody.scrollTop = adminActiveChatBody.scrollHeight;
    }

    async function sendAdminReply() {
        if (!activeAdminTicketId) return;
        const text = adminChatReplyInput?.value.trim();
        if (!text) return;

        if (memoryTickets[activeAdminTicketId]) {
            memoryTickets[activeAdminTicketId].messages.push({
                sender: 'admin',
                text: text,
                timestamp: Date.now()
            });
            if (adminChatReplyInput) adminChatReplyInput.value = '';
            
            // Optimistic UI update
            loadAdminChat(activeAdminTicketId);
            loadAdminTickets(); // update last message
            
            await saveTicketToSupabase(memoryTickets[activeAdminTicketId]);
        }
    }

    if (adminChatReplyBtn) {
        adminChatReplyBtn.addEventListener('click', sendAdminReply);
    }
    if (adminChatReplyInput) {
        adminChatReplyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAdminReply();
        });
    }

    // ==========================================
    // NAVEGAÇÃO DO DASHBOARD
    // ==========================================
    const dashboardGoAi = document.getElementById('dashboard-go-ai');
    const dashboardContainer = document.getElementById('dashboard-container');
    
    if (dashboardGoAi) {
        dashboardGoAi.addEventListener('click', () => {
            if (dashboardContainer) dashboardContainer.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';
        });
    }
    // ==========================================
    // HEADER & LOGOUT
    // ==========================================
    const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
    // Using existing userProfileBtn and logoutBtn from top of file

    if (userProfileBtn && profileDropdownMenu) {
        // Toggle dropdown on click
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userProfileBtn.classList.toggle('active');
            profileDropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target as Node) && !profileDropdownMenu.contains(e.target as Node)) {
                userProfileBtn.classList.remove('active');
                profileDropdownMenu.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear current user
            localStorage.removeItem('currentUser');
            currentUser = null;
            
            // Hide dashboard & app, show login
            const dashboardContainer = document.getElementById('dashboard-container');
            const loginPage = document.getElementById('login-page');
            
            if (dashboardContainer) dashboardContainer.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            if (loginPage) loginPage.style.display = 'flex';
            
            // Remove user avatar from widget if needed
            if (userProfileBtn && profileDropdownMenu) {
                userProfileBtn.classList.remove('active');
                profileDropdownMenu.classList.remove('show');
            }
        });
    }

});

