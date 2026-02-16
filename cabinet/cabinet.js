/**
 * ВизитИИ — Cabinet Application
 * Личный кабинет владельца бизнеса
 */

const API = window.location.origin;
let token = localStorage.getItem('vizitii_token');
let ownerData = null;
let businessData = null;
let staffList = [];
let currentMode = localStorage.getItem('vizitii_mode') || 'team';
let selectedFeedbackType = 'idea';
let isDemo = localStorage.getItem('vizitii_demo') === 'true';

// ============================================================
// Demo Mode Data
// ============================================================

const DEMO_DATA = {
    owner: {
        id: 1,
        email: 'demo@vizitii.ru',
        company_name: 'Салон «Аврора» (демо)',
        phone: '+7 (999) 123-45-67',
        business_id: 1
    },
    business: {
        id: 1,
        slug: 'aurora-demo',
        name: 'Салон красоты «Аврора»',
        description: 'Премиальный салон красоты в центре Москвы. Стрижки, окрашивание, маникюр, косметология.',
        address: 'г. Москва, ул. Тверская, д. 15',
        phone: '+7 (999) 123-45-67',
        welcome_message: 'Здравствуйте! Добро пожаловать в салон «Аврора». Чем могу помочь?',
        primary_color: '#4F46E5'
    },
    staff: [
        { id: 1, name: 'Анна Смирнова', role: 'Стилист-колорист', is_active: true },
        { id: 2, name: 'Мария Петрова', role: 'Мастер маникюра', is_active: true },
        { id: 3, name: 'Елена Козлова', role: 'Косметолог', is_active: true }
    ],
    services: [
        { id: 1, name: 'Женская стрижка', description: 'Мытьё, стрижка, укладка', price: 3500, duration_minutes: 60, is_active: true },
        { id: 2, name: 'Окрашивание', description: 'Профессиональное окрашивание', price: 6000, duration_minutes: 120, is_active: true },
        { id: 3, name: 'Маникюр с покрытием', description: 'Маникюр + гель-лак', price: 2500, duration_minutes: 90, is_active: true },
        { id: 4, name: 'Чистка лица', description: 'Ультразвуковая чистка', price: 4000, duration_minutes: 60, is_active: true }
    ],
    schedule: [
        { id: 1, staff_name: 'Анна Смирнова', day_of_week: 0, start_time: '09:00', end_time: '18:00' },
        { id: 2, staff_name: 'Анна Смирнова', day_of_week: 1, start_time: '09:00', end_time: '18:00' },
        { id: 3, staff_name: 'Мария Петрова', day_of_week: 0, start_time: '10:00', end_time: '19:00' },
        { id: 4, staff_name: 'Мария Петрова', day_of_week: 2, start_time: '10:00', end_time: '19:00' },
        { id: 5, staff_name: 'Елена Козлова', day_of_week: 1, start_time: '11:00', end_time: '20:00' },
        { id: 6, staff_name: 'Елена Козлова', day_of_week: 3, start_time: '11:00', end_time: '20:00' }
    ],
    bookings: [
        { id: 1, client_name: 'Ольга И.', service_name: 'Женская стрижка', staff_name: 'Анна Смирнова', date: new Date().toISOString().split('T')[0], time: '10:00', status: 'confirmed' },
        { id: 2, client_name: 'Татьяна М.', service_name: 'Маникюр с покрытием', staff_name: 'Мария Петрова', date: new Date().toISOString().split('T')[0], time: '11:30', status: 'pending' },
        { id: 3, client_name: 'Ирина К.', service_name: 'Окрашивание', staff_name: 'Анна Смирнова', date: new Date().toISOString().split('T')[0], time: '14:00', status: 'confirmed' },
        { id: 4, client_name: 'Наталья С.', service_name: 'Чистка лица', staff_name: 'Елена Козлова', date: new Date().toISOString().split('T')[0], time: '15:00', status: 'pending' }
    ],
    feedback: [
        { id: 1, feedback_type: 'idea', text: 'Было бы удобно получать напоминания за день до визита', source: 'telegram', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, feedback_type: 'idea', text: 'Добавьте возможность выбирать мастера по фото работ', source: 'cabinet', created_at: new Date(Date.now() - 172800000).toISOString() }
    ]
};

function demoResponse(data) {
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)) };
}

// ============================================================
// Init
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        checkAuth();
    } else {
        showAuthScreen();
    }
});

// ============================================================
// Auth
// ============================================================

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        showError(errorEl, 'Заполните все поля');
        return;
    }

    // Demo mode
    if (email === 'demo@vizitii.ru' && password === 'demo123') {
        isDemo = true;
        token = 'demo-token';
        localStorage.setItem('vizitii_token', token);
        localStorage.setItem('vizitii_demo', 'true');
        checkAuth();
        return;
    }

    try {
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
            showError(errorEl, data.detail || 'Ошибка входа');
            return;
        }

        token = data.access_token;
        localStorage.setItem('vizitii_token', token);
        localStorage.setItem('vizitii_demo', 'false');
        isDemo = false;
        checkAuth();
    } catch (err) {
        showError(errorEl, 'Ошибка подключения к серверу');
    }
}

async function handleRegister() {
    const company_name = document.getElementById('reg-company').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');

    if (!company_name || !email || !phone || !password) {
        showError(errorEl, 'Заполните все поля');
        return;
    }

    if (password.length < 6) {
        showError(errorEl, 'Пароль должен быть минимум 6 символов');
        return;
    }

    try {
        const res = await fetch(`${API}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_name, email, phone, password })
        });

        const data = await res.json();
        if (!res.ok) {
            showError(errorEl, data.detail || 'Ошибка регистрации');
            return;
        }

        token = data.access_token;
        localStorage.setItem('vizitii_token', token);
        checkAuth();
    } catch (err) {
        showError(errorEl, 'Ошибка подключения к серверу');
    }
}

async function checkAuth() {
    if (isDemo) {
        ownerData = DEMO_DATA.owner;
        businessData = DEMO_DATA.business;
        staffList = [...DEMO_DATA.staff];
        document.getElementById('owner-name').textContent = ownerData.company_name;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        setMode(currentMode);
        showSection('overview');
        return;
    }

    try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) {
            handleLogout();
            return;
        }

        ownerData = await res.json();
        document.getElementById('owner-name').textContent = ownerData.company_name;

        // Load business
        await loadBusinessData();

        // Show dashboard
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        // Set mode
        setMode(currentMode);

        // Load initial data
        showSection('overview');
    } catch (err) {
        handleLogout();
    }
}

function handleLogout() {
    token = null;
    ownerData = null;
    businessData = null;
    isDemo = false;
    localStorage.removeItem('vizitii_token');
    localStorage.removeItem('vizitii_demo');
    showAuthScreen();
}

// ============================================================
// API Helper
// ============================================================

async function apiFetch(url, options = {}) {
    // Demo mode: return mock data
    if (isDemo) {
        if (url.includes('/api/auth/me')) return demoResponse(DEMO_DATA.owner);
        if (url.includes('/api/owner/business')) return demoResponse(DEMO_DATA.business);
        if (url.includes('/api/owner/staff')) return demoResponse(DEMO_DATA.staff);
        if (url.includes('/api/owner/services')) return demoResponse(DEMO_DATA.services);
        if (url.includes('/api/owner/schedule')) return demoResponse(DEMO_DATA.schedule);
        if (url.includes('/api/owner/bookings')) return demoResponse(DEMO_DATA.bookings);
        if (url.includes('/api/feedback')) return demoResponse(DEMO_DATA.feedback);
        if (url.includes('/api/support-tickets')) return demoResponse([]);
        // For POST/PATCH/DELETE in demo — just return ok
        if (options.method && options.method !== 'GET') {
            return demoResponse({ ok: true, message: 'Демо-режим: изменения не сохраняются' });
        }
        return demoResponse([]);
    }

    const res = await fetch(`${API}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            msg = body.detail || msg;
        } catch (_) { }
        throw new Error(msg);
    }
    return res;
}

// ============================================================
// Business Data
// ============================================================

async function loadBusinessData() {
    try {
        const res = await apiFetch('/api/owner/business');
        if (res.ok) {
            businessData = await res.json();
        }
    } catch (err) {
        console.error('Failed to load business:', err);
    }
}

// ============================================================
// Sections Navigation
// ============================================================

function showSection(name) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${name}`).classList.remove('hidden');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-section="${name}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update title
    const titles = {
        overview: '📊 Обзор',
        staff: '👥 Сотрудники',
        services: '📋 Услуги',
        schedule: '🕐 Расписание',
        bookings: '📅 Записи',
        feedback: '💬 Отзывы клиентов',
        support: '📨 Обращения в поддержку',
        settings: '⚙️ Настройки'
    };
    document.getElementById('section-title').textContent = titles[name] || name;

    // Load data
    switch (name) {
        case 'overview': loadOverview(); break;
        case 'staff': loadStaff(); break;
        case 'services': loadServices(); break;
        case 'schedule': loadSchedule(); break;
        case 'bookings': loadBookings(); break;
        case 'feedback': loadFeedbackList(); break;
        case 'support': loadSupportTickets(); break;
        case 'settings': loadSettings(); break;
    }
}

// ============================================================
// Mode Toggle (Team / Solo)
// ============================================================

function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('vizitii_mode', mode);

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const isSolo = mode === 'solo';

    // Hide/show staff nav item in sidebar
    const staffNav = document.querySelector('.nav-item[data-section="staff"]');
    if (staffNav) {
        if (isSolo) staffNav.classList.add('hidden');
        else staffNav.classList.remove('hidden');
    }

    // Hide/show staff-related elements in schedule modal
    const scheduleStaffGroup = document.getElementById('schedule-staff-group');
    if (scheduleStaffGroup) {
        if (isSolo) scheduleStaffGroup.classList.add('hidden');
        else scheduleStaffGroup.classList.remove('hidden');
    }

    // Hide/show staff columns and staff filter in bookings
    document.querySelectorAll('.staff-column').forEach(el => {
        if (isSolo) el.classList.add('hidden');
        else el.classList.remove('hidden');
    });

    const bookingsStaffFilter = document.getElementById('bookings-staff-filter');
    if (bookingsStaffFilter) {
        if (isSolo) bookingsStaffFilter.classList.add('hidden');
        else bookingsStaffFilter.classList.remove('hidden');
    }

    // If user is on staff section in solo mode — redirect to overview
    const staffSection = document.getElementById('section-staff');
    if (isSolo && staffSection && !staffSection.classList.contains('hidden')) {
        showSection('overview');
    }

    // Update overview staff stat card visibility
    const staffStatCard = document.getElementById('stat-staff-count');
    if (staffStatCard) {
        const card = staffStatCard.closest('.stat-card');
        if (card) {
            if (isSolo) card.classList.add('hidden');
            else card.classList.remove('hidden');
        }
    }
}

// ============================================================
// Overview
// ============================================================

async function loadOverview() {
    try {
        // Load stats
        const [staffRes, servicesRes, bookingsRes, feedbackRes] = await Promise.all([
            apiFetch('/api/owner/staff'),
            apiFetch('/api/owner/services'),
            apiFetch(`/api/owner/bookings?date=${todayStr()}`),
            apiFetch(`/api/feedback?business_id=${ownerData.business_id || 0}`)
        ]);

        const staff = await staffRes.json();
        const services = await servicesRes.json();
        const bookings = await bookingsRes.json();
        const feedback = await feedbackRes.json();

        document.getElementById('stat-staff-count').textContent = staff.filter(s => s.is_active).length;
        document.getElementById('stat-services-count').textContent = services.filter(s => s.is_active).length;
        document.getElementById('stat-bookings-today').textContent = bookings.length;
        document.getElementById('stat-feedback-count').textContent = feedback.length;

        // Bot link
        if (businessData) {
            document.getElementById('bot-link').value =
                `https://t.me/vizitii_bot?start=${businessData.slug}`;
        }
    } catch (err) {
        console.error('Overview error:', err);
    }
}

function copyLink() {
    const input = document.getElementById('bot-link');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Ссылка скопирована!');
}

// ============================================================
// Staff CRUD
// ============================================================

let editingStaffId = null;

async function loadStaff() {
    try {
        const res = await apiFetch('/api/owner/staff');
        staffList = await res.json();

        const container = document.getElementById('staff-list');
        const activeStaff = staffList.filter(s => s.is_active);

        if (activeStaff.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>Нет сотрудников. Добавьте первого!</p>
                </div>`;
            return;
        }

        container.innerHTML = activeStaff.map(s => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${escHtml(s.name)}</h4>
                    <p>${escHtml(s.role || 'Без специализации')}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" data-edit-staff="${s.id}" data-name="${escAttr(s.name)}" data-role="${escAttr(s.role)}" onclick="editStaffFromBtn(this)">✏️</button>
                    <button class="btn-icon danger" onclick="deleteStaff(${s.id})">🗑</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Staff load error:', err);
    }
}

function showAddStaff() {
    editingStaffId = null;
    document.getElementById('staff-modal-title').textContent = 'Добавить сотрудника';
    document.getElementById('staff-name').value = '';
    document.getElementById('staff-role').value = '';
    document.getElementById('modal-staff').classList.remove('hidden');
}

function editStaffFromBtn(btn) {
    const id = parseInt(btn.dataset.editStaff);
    const name = btn.dataset.name || '';
    const role = btn.dataset.role || '';
    editStaff(id, name, role);
}

function editStaff(id, name, role) {
    editingStaffId = id;
    document.getElementById('staff-modal-title').textContent = 'Редактировать сотрудника';
    document.getElementById('staff-name').value = name;
    document.getElementById('staff-role').value = role;
    document.getElementById('modal-staff').classList.remove('hidden');
}

async function saveStaff() {
    const name = document.getElementById('staff-name').value.trim();
    const role = document.getElementById('staff-role').value.trim();

    if (!name) { showToast('Введите имя', true); return; }

    try {
        const url = editingStaffId
            ? `/api/owner/staff/${editingStaffId}`
            : '/api/owner/staff';
        const method = editingStaffId ? 'PATCH' : 'POST';

        await apiFetch(url, {
            method,
            body: JSON.stringify({ name, role })
        });

        closeModal('modal-staff');
        loadStaff();
        showToast(editingStaffId ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
    } catch (err) {
        showToast('Ошибка сохранения', true);
    }
}

async function deleteStaff(id) {
    if (!confirm('Удалить сотрудника?')) return;
    try {
        await apiFetch(`/api/owner/staff/${id}`, { method: 'DELETE' });
        loadStaff();
        showToast('Сотрудник удалён');
    } catch (err) {
        showToast('Ошибка удаления', true);
    }
}

// ============================================================
// Services CRUD
// ============================================================

async function loadServices() {
    try {
        const res = await apiFetch('/api/owner/services');
        const services = await res.json();
        const container = document.getElementById('services-list');
        const active = services.filter(s => s.is_active);

        if (active.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Нет услуг. Добавьте первую!</p>
                </div>`;
            return;
        }

        container.innerHTML = active.map(s => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${escHtml(s.name)}</h4>
                    <p>${escHtml(s.description || '')} • ${s.duration_minutes} мин.</p>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                    <strong style="color:var(--green);white-space:nowrap">${escHtml(String(s.price))}₽</strong>
                    <button class="btn-icon danger" onclick="deleteService(${s.id})">🗑</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Services load error:', err);
    }
}

function showAddService() {
    document.getElementById('service-name').value = '';
    document.getElementById('service-desc').value = '';
    document.getElementById('service-price').value = '';
    document.getElementById('service-duration').value = '60';
    document.getElementById('modal-service').classList.remove('hidden');
}

async function saveService() {
    const name = document.getElementById('service-name').value.trim();
    const description = document.getElementById('service-desc').value.trim();
    const price = parseFloat(document.getElementById('service-price').value) || 0;
    const duration_minutes = parseInt(document.getElementById('service-duration').value) || 60;

    if (!name) { showToast('Введите название', true); return; }

    try {
        await apiFetch('/api/owner/services', {
            method: 'POST',
            body: JSON.stringify({ name, description, price, duration_minutes })
        });
        closeModal('modal-service');
        loadServices();
        showToast('Услуга добавлена');
    } catch (err) {
        showToast('Ошибка сохранения', true);
    }
}

async function deleteService(id) {
    if (!confirm('Удалить услугу?')) return;
    try {
        await apiFetch(`/api/owner/services/${id}`, { method: 'DELETE' });
        loadServices();
        showToast('Услуга удалена');
    } catch (err) {
        showToast('Ошибка', true);
    }
}

// ============================================================
// Work Schedule
// ============================================================

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

async function loadSchedule() {
    try {
        const res = await apiFetch('/api/owner/schedule');
        const schedules = await res.json();
        const container = document.getElementById('schedule-list');

        if (schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🕐</div>
                    <p>Расписание не задано. Добавьте рабочие часы!</p>
                </div>`;
            return;
        }

        container.innerHTML = schedules.map(s => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${DAY_NAMES[s.day_of_week]}</h4>
                    <p>${escHtml(s.staff_name || 'Общее расписание')} • ${escHtml(s.start_time)} — ${escHtml(s.end_time)}</p>
                </div>
                <div class="item-actions">
                    <button class="btn-icon danger" onclick="deleteSchedule(${s.id})">🗑</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Schedule load error:', err);
    }
}

async function showAddSchedule() {
    // Populate staff select
    const select = document.getElementById('schedule-staff-select');
    select.innerHTML = '<option value="">— Общее расписание бизнеса —</option>';

    try {
        const res = await apiFetch('/api/owner/staff');
        const staff = await res.json();
        staff.filter(s => s.is_active).forEach(s => {
            select.innerHTML += `<option value="${s.id}">${escHtml(s.name)} (${escHtml(s.role)})</option>`;
        });
    } catch (err) { }

    document.getElementById('modal-schedule').classList.remove('hidden');
}

async function saveSchedule() {
    const staff_id = document.getElementById('schedule-staff-select').value || null;
    const day_of_week = parseInt(document.getElementById('schedule-day').value);
    const start_time = document.getElementById('schedule-start').value;
    const end_time = document.getElementById('schedule-end').value;

    try {
        const res = await apiFetch('/api/owner/schedule', {
            method: 'POST',
            body: JSON.stringify({
                staff_id: staff_id ? parseInt(staff_id) : null,
                day_of_week,
                start_time,
                end_time
            })
        });

        if (!res.ok) {
            const data = await res.json();
            showToast(data.detail || 'Ошибка', true);
            return;
        }

        closeModal('modal-schedule');
        loadSchedule();
        showToast('Расписание добавлено');
    } catch (err) {
        showToast('Ошибка сохранения', true);
    }
}

async function deleteSchedule(id) {
    if (!confirm('Удалить расписание?')) return;
    try {
        await apiFetch(`/api/owner/schedule/${id}`, { method: 'DELETE' });
        loadSchedule();
        showToast('Расписание удалено');
    } catch (err) {
        showToast('Ошибка', true);
    }
}

// ============================================================
// Bookings
// ============================================================

async function loadBookings() {
    const dateFilter = document.getElementById('bookings-date-filter').value || '';
    const staffFilter = document.getElementById('bookings-staff-filter').value || '';

    // Populate staff filter
    const staffSelect = document.getElementById('bookings-staff-filter');
    if (staffSelect.options.length <= 1 && staffList.length > 0) {
        staffList.filter(s => s.is_active).forEach(s => {
            staffSelect.innerHTML += `<option value="${s.id}">${escHtml(s.name)}</option>`;
        });
    }

    try {
        let url = '/api/owner/bookings?';
        if (dateFilter) url += `date=${dateFilter}&`;
        if (staffFilter) url += `staff_id=${staffFilter}&`;

        const res = await apiFetch(url);
        const bookings = await res.json();

        const container = document.getElementById('bookings-list');
        const calendarView = document.getElementById('calendar-view');

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <p>Нет записей${dateFilter ? ' на выбранную дату' : ''}</p>
                </div>`;
            calendarView.innerHTML = '';
            return;
        }

        // List view (always shown for Solo mode)
        container.innerHTML = bookings.map(b => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${escHtml(b.client_name || 'Клиент')} — ${escHtml(b.service_name)}</h4>
                    <p>${escHtml(b.staff_name || '')} • 📅 ${escHtml(b.date)} в ${escHtml(b.time)}</p>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="badge badge-${b.status}">${statusText(b.status)}</span>
                    ${b.status === 'pending' ? `<button class="btn-icon" onclick="confirmBooking(${b.id})" title="Подтвердить">✅</button>` : ''}
                    ${(b.status === 'pending' || b.status === 'confirmed') ? `<button class="btn-icon danger" onclick="cancelBooking(${b.id})" title="Отменить">❌</button>` : ''}
                </div>
            </div>
        `).join('');

        // Calendar view for Team mode
        if (currentMode === 'team') {
            renderCalendarView(bookings);
        } else {
            calendarView.innerHTML = '';
        }
    } catch (err) {
        console.error('Bookings load error:', err);
    }
}

function renderCalendarView(bookings) {
    const calendarView = document.getElementById('calendar-view');

    // Group bookings by time slots
    const slots = {};
    bookings.forEach(b => {
        const key = b.time;
        if (!slots[key]) slots[key] = [];
        slots[key].push(b);
    });

    const sortedTimes = Object.keys(slots).sort();

    let html = '<div class="calendar-header"><div>Время</div><div>Записи</div></div>';

    sortedTimes.forEach(time => {
        html += `<div class="calendar-row">
            <div class="calendar-time">${time}</div>
            <div class="calendar-cell">
                ${slots[time].map(b => `
                    <div class="calendar-slot">
                        <strong>${escHtml(b.client_name || 'Клиент')}</strong><br>
                        ${escHtml(b.service_name)}${b.staff_name ? ' • ' + escHtml(b.staff_name) : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;
    });

    calendarView.innerHTML = html;
}

async function confirmBooking(id) {
    try {
        await apiFetch(`/api/owner/bookings/${id}/confirm`, { method: 'POST' });
        loadBookings();
        showToast('Запись подтверждена');
    } catch (err) {
        console.error('confirmBooking error:', err);
        showToast(err.message || 'Ошибка подтверждения', true);
    }
}

async function cancelBooking(id) {
    if (!confirm('Отменить запись?')) return;
    try {
        await apiFetch(`/api/owner/bookings/${id}/cancel`, { method: 'POST' });
        loadBookings();
        showToast('Запись отменена');
    } catch (err) {
        console.error('cancelBooking error:', err);
        showToast(err.message || 'Ошибка отмены', true);
    }
}

// ============================================================
// Feedback
// ============================================================

async function loadFeedbackList() {
    try {
        const res = await apiFetch(`/api/feedback?business_id=${ownerData.business_id || 0}`);
        const items = await res.json();
        const container = document.getElementById('feedback-list');

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>Пока нет отзывов. Клиенты смогут оставлять их через кнопку обратной связи.</p>
                </div>`;
            return;
        }

        const typeIcons = { idea: '💡', bug: '🐛', inconvenient: '😤' };
        const typeLabels = { idea: 'Идея', bug: 'Баг', inconvenient: 'Неудобно' };

        container.innerHTML = items.map(f => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${typeIcons[f.feedback_type] || '💬'} ${typeLabels[f.feedback_type] || escHtml(f.feedback_type)}</h4>
                    <p>${escHtml(f.text)}</p>
                    <p style="margin-top:4px;font-size:12px;color:var(--text-muted)">${escHtml(f.source)} • ${formatDate(f.created_at)}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Feedback load error:', err);
    }
}

function showFeedbackForm() {
    selectedFeedbackType = 'idea';
    document.querySelectorAll('.feedback-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.feedback-type-btn[data-type="idea"]').classList.add('active');
    document.getElementById('feedback-text').value = '';
    document.getElementById('modal-feedback').classList.remove('hidden');
}

function selectFeedbackType(type) {
    selectedFeedbackType = type;
    document.querySelectorAll('.feedback-type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.feedback-type-btn[data-type="${type}"]`).classList.add('active');
}

async function submitFeedback() {
    const text = document.getElementById('feedback-text').value.trim();
    if (!text) { showToast('Напишите текст', true); return; }

    try {
        const res = await fetch(`${API}/api/feedback/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                business_slug: businessData?.slug || null,
                feedback_type: selectedFeedbackType,
                text,
                source: 'cabinet'
            })
        });

        if (res.ok) {
            closeModal('modal-feedback');
            showToast('Спасибо за обратную связь! 🎉');
        } else {
            const data = await res.json();
            showToast(data.detail || 'Ошибка', true);
        }
    } catch (err) {
        showToast('Ошибка отправки', true);
    }
}

// ============================================================
// Settings
// ============================================================

let currentSupportFilter = 'new';

// ============================================================
// Support Tickets
// ============================================================

async function loadSupportTickets() {
    filterSupport(currentSupportFilter);
}

function filterSupport(filter) {
    currentSupportFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    switch (filter) {
        case 'new': loadNewTickets(); break;
        case 'groups': loadTicketGroups(); break;
        case 'resolved': loadResolvedTickets(); break;
        case 'all': loadAllTickets(); break;
    }
}

async function loadNewTickets() {
    try {
        const res = await apiFetch('/api/support/tickets');
        const tickets = await res.json();
        renderTicketList(tickets, true);
    } catch (err) {
        console.error('Support tickets error:', err);
    }
}

async function loadAllTickets() {
    try {
        const res = await apiFetch('/api/support/tickets/all');
        const tickets = await res.json();
        renderTicketList(tickets, false);
    } catch (err) {
        console.error('All tickets error:', err);
    }
}

async function loadResolvedTickets() {
    try {
        const res = await apiFetch('/api/support/tickets/all?status=resolved');
        const tickets = await res.json();
        renderTicketList(tickets, false);
    } catch (err) {
        console.error('Resolved tickets error:', err);
    }
}

function renderTicketList(tickets, showProcessBtn) {
    const container = document.getElementById('support-content');
    const statsEl = document.getElementById('support-stats');

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📨</div>
                <p>Нет обращений в этом разделе</p>
            </div>`;
        statsEl.innerHTML = '';
        return;
    }

    // Stats
    const stats = { bug: 0, idea: 0, inconvenient: 0 };
    tickets.forEach(t => { stats[t.feedback_type] = (stats[t.feedback_type] || 0) + 1; });
    statsEl.innerHTML = `
        <div class="support-stat-row">
            <span class="support-stat-badge bug">🐛 Баги: ${stats.bug || 0}</span>
            <span class="support-stat-badge idea">💡 Идеи: ${stats.idea || 0}</span>
            <span class="support-stat-badge inconvenient">😤 Неудобства: ${stats.inconvenient || 0}</span>
            <span class="support-stat-badge total">Всего: ${tickets.length}</span>
        </div>`;

    const typeIcons = { idea: '💡', bug: '🐛', inconvenient: '😤' };
    const typeLabels = { idea: 'Идея', bug: 'Баг', inconvenient: 'Неудобство' };
    const statusLabels = {
        open: '🟢 Открыто',
        in_progress: '🟡 В работе',
        resolved: '✅ Решено',
        closed: '✔️ Закрыто',
        wontfix: '⛔ Не будет исправлено'
    };
    const responseIcons = {
        positive: '👍',
        negative: '👎',
        none: '⏳'
    };

    container.innerHTML = tickets.map(t => {
        const processBtn = showProcessBtn && !t.processed
            ? `<button class="btn-primary btn-sm" onclick="processTicket(${t.id})">✅ Обработать</button>`
            : '';
        const responseInfo = t.user_response
            ? `<span class="response-indicator">${responseIcons[t.user_response] || '❓'}</span>`
            : (t.response_deadline ? '<span class="response-indicator">⏳ Ожидаем ОС</span>' : '');
        const groupLabel = t.group_key
            ? `<span class="group-label">📂 ${escHtml(t.group_key)}</span>`
            : '';

        return `
            <div class="item-card ticket-card ticket-${t.status}">
                <div class="item-info">
                    <h4>${typeIcons[t.feedback_type] || '💬'} ${typeLabels[t.feedback_type] || t.feedback_type}</h4>
                    <p>${escHtml(t.text)}</p>
                    <div class="ticket-meta">
                        <span class="ticket-status status-${t.status}">${statusLabels[t.status] || t.status}</span>
                        <span class="ticket-priority priority-${t.priority}">${t.priority}</span>
                        ${groupLabel}
                        ${responseInfo}
                        <span class="ticket-date">${formatDate(t.created_at)}</span>
                    </div>
                    ${t.resolution_note ? `<div class="resolution-note">📩 ${escHtml(t.resolution_note)}</div>` : ''}
                </div>
                <div class="item-actions">
                    ${processBtn}
                    ${t.status === 'resolved' && !t.user_response ? `
                        <button class="btn-icon" onclick="recordUserResponse(${t.id}, 'positive')" title="Положительная ОС">👍</button>
                        <button class="btn-icon danger" onclick="recordUserResponse(${t.id}, 'negative')" title="Отрицательная ОС">👎</button>
                    ` : ''}
                </div>
            </div>`;
    }).join('');
}

async function loadTicketGroups() {
    try {
        const res = await apiFetch('/api/support/groups');
        const groups = await res.json();
        const container = document.getElementById('support-content');
        const statsEl = document.getElementById('support-stats');

        if (groups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📂</div>
                    <p>Нет групп обращений. Обработайте новые обращения, чтобы создать группы.</p>
                </div>`;
            statsEl.innerHTML = '';
            return;
        }

        statsEl.innerHTML = `
            <div class="support-stat-row">
                <span class="support-stat-badge total">📂 Групп: ${groups.length}</span>
            </div>`;

        const typeIcons = { idea: '💡', bug: '🐛', inconvenient: '😤' };

        container.innerHTML = groups.map(g => {
            const statusList = Object.entries(g.statuses)
                .map(([s, c]) => `${s}: ${c}`).join(', ');
            const negativeWarning = g.has_negative_response
                ? '<span class="negative-warning">⚠️ Есть отрицательная ОС</span>'
                : '';

            return `
                <div class="item-card ticket-group">
                    <div class="item-info">
                        <h4>${typeIcons[g.feedback_type] || '💬'} ${escHtml(g.group_key)}</h4>
                        <p>📨 Обращений: <strong>${g.count}</strong> • ${statusList}</p>
                        <p class="ticket-meta">Последнее: ${escHtml(g.latest_text.substring(0, 100))}${g.latest_text.length > 100 ? '...' : ''}</p>
                        ${negativeWarning}
                    </div>
                    <div class="item-actions">
                        <button class="btn-primary btn-sm" onclick="showResolveModal('${esc(g.group_key)}')">✅ Устранено</button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Groups error:', err);
    }
}

async function processTicket(id) {
    try {
        await apiFetch(`/api/support/tickets/${id}/process`, { method: 'POST' });
        showToast('Обращение обработано и добавлено в группу');
        loadSupportTickets();
    } catch (err) {
        showToast('Ошибка обработки', true);
    }
}

function showResolveModal(groupKey) {
    document.getElementById('resolve-group-key').value = groupKey;
    document.getElementById('resolve-note').value = '';
    document.getElementById('modal-resolve').classList.remove('hidden');
}

async function submitResolveGroup() {
    const groupKey = document.getElementById('resolve-group-key').value;
    const note = document.getElementById('resolve-note').value.trim();
    if (!note) { showToast('Напишите сообщение', true); return; }

    try {
        await apiFetch(`/api/support/group/${encodeURIComponent(groupKey)}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ note })
        });
        closeModal('modal-resolve');
        showToast('Группа помечена как устранённая. Уведомления отправлены 🎉');
        loadSupportTickets();
    } catch (err) {
        showToast('Ошибка закрытия группы', true);
    }
}

async function recordUserResponse(id, response) {
    const label = response === 'positive' ? 'положительную' : 'отрицательную';
    if (!confirm(`Записать ${label} обратную связь?`)) return;

    try {
        await apiFetch(`/api/support/tickets/${id}/user-response`, {
            method: 'POST',
            body: JSON.stringify({ response })
        });
        if (response === 'negative') {
            showToast('Группа возвращена в работу', true);
        } else {
            showToast('Обращение закрыто 🎉');
        }
        loadSupportTickets();
    } catch (err) {
        showToast('Ошибка записи ОС', true);
    }
}

async function autoCloseExpired() {
    try {
        const res = await apiFetch('/api/support/auto-close', { method: 'POST' });
        const data = await res.json();
        showToast(`Автозакрытие: ${data.count} обращений`);
        loadSupportTickets();
    } catch (err) {
        showToast('Ошибка автозакрытия', true);
    }
}

async function loadSettings() {
    if (!businessData) return;

    document.getElementById('settings-name').value = businessData.name || '';
    document.getElementById('settings-desc').value = businessData.description || '';
    document.getElementById('settings-address').value = businessData.address || '';
    document.getElementById('settings-phone').value = businessData.phone || '';
    document.getElementById('settings-welcome').value = businessData.welcome_message || '';
    document.getElementById('settings-color').value = businessData.primary_color || '#6C5CE7';
}

async function saveSettings() {
    const data = {
        name: document.getElementById('settings-name').value.trim(),
        description: document.getElementById('settings-desc').value.trim(),
        address: document.getElementById('settings-address').value.trim(),
        phone: document.getElementById('settings-phone').value.trim(),
        welcome_message: document.getElementById('settings-welcome').value.trim(),
        primary_color: document.getElementById('settings-color').value,
    };

    try {
        const res = await apiFetch('/api/owner/business', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });

        if (res.ok) {
            businessData = await res.json();
            showToast('Настройки сохранены');
        } else {
            showToast('Ошибка сохранения', true);
        }
    } catch (err) {
        showToast('Ошибка подключения', true);
    }
}

// ============================================================
// Utilities
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function statusText(status) {
    const map = { pending: '⏳ Ожидает', confirmed: '✅ Подтверждено', cancelled: '❌ Отменено', completed: '✔️ Завершено' };
    return map[status] || status;
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return isoStr; }
}

function esc(str) {
    // SECURITY: escape both quotes AND HTML special chars
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// SECURITY: escape for HTML data-attributes
function escAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// HIGH-5: XSS-защита — экранирование HTML для innerHTML
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) {
        toast.style.borderColor = 'var(--red)';
        toast.style.color = 'var(--red)';
    }
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
