// Social Calendar & Events Engine — SillyTavern extension
// Keeps an in-RP date, injects "today on campus" + upcoming events into the prompt,
// and announces events in chat when the date lands on them. EN/RU UI.

const MODULE = 'st-social-calendar';
const INJECT_KEY = 'social_calendar';

const L10N = {
    en: {
        title: '📅 Social Calendar',
        enabled: 'Enabled',
        inject: 'Inject date & events into prompt',
        announce: 'Announce events in chat when the day arrives',
        language: 'Language',
        today: 'In-RP date',
        nextDay: '+1 day',
        nextWeek: '+1 week',
        prevDay: '-1 day',
        setDate: 'Set',
        events: 'Events',
        addEvent: 'Add event',
        namePh: 'Event name…',
        promptPh: 'What happens (context for the AI)…',
        datePh: 'MM-DD',
        remove: 'Remove',
        weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        injectToday: (d) => `[In-RP calendar: today is ${d}.`,
        injectEvent: (name, prompt) => `TODAY'S EVENT — ${name}: ${prompt} NPCs are aware of it and react accordingly.`,
        injectUpcoming: 'Upcoming campus events:',
        injectFooter: ']',
        announceMsg: (name, prompt) => `📅 <b>Today on campus: ${name}</b><br>${prompt}`,
    },
    ru: {
        title: '📅 Социальный календарь',
        enabled: 'Включено',
        inject: 'Внедрять дату и события в промпт',
        announce: 'Объявлять события в чате, когда наступает их день',
        language: 'Язык',
        today: 'Дата в RP',
        nextDay: '+1 день',
        nextWeek: '+1 неделя',
        prevDay: '-1 день',
        setDate: 'Задать',
        events: 'События',
        addEvent: 'Добавить событие',
        namePh: 'Название события…',
        promptPh: 'Что происходит (контекст для ИИ)…',
        datePh: 'ММ-ДД',
        remove: 'Удалить',
        weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
        months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
        injectToday: (d) => `[Внутриигровой календарь: сегодня ${d}.`,
        injectEvent: (name, prompt) => `СОБЫТИЕ СЕГОДНЯ — ${name}: ${prompt} NPC знают о нём и реагируют соответственно.`,
        injectUpcoming: 'Ближайшие события кампуса:',
        injectFooter: ']',
        announceMsg: (name, prompt) => `📅 <b>Сегодня на кампусе: ${name}</b><br>${prompt}`,
    },
};

const DEFAULT_EVENTS = [
    { date: '09-07', name: 'Rush Week begins', prompt: 'Greek life rush week: fraternities and sororities host parties and recruit pledges all week.' },
    { date: '10-17', name: 'Homecoming', prompt: 'Homecoming weekend: Titans football game, alumni on campus, huge parties at every frat house.' },
    { date: '11-05', name: 'Knights season opener', prompt: 'First basketball game of the season. The whole campus shows up; the Knights are the center of attention.' },
    { date: '12-12', name: 'Winter Gala', prompt: 'Formal winter gala hosted by student government. Black tie, old money on display.' },
    { date: '02-14', name: "Valentine's Mixer", prompt: 'Kappa Rho and Sigma Rho co-host an exclusive Valentine mixer. Invitation only.' },
    { date: '04-06', name: 'Greek Week', prompt: 'A week of competitions between Greek houses: games, pranks, sabotage, and old rivalries flaring up.' },
    { date: '05-08', name: 'Spring Formal', prompt: 'The biggest social event of the spring. Everyone needs a date; social hierarchy is on full display.' },
];

const defaultSettings = {
    lang: 'en',
    enabled: true,
    inject: true,
    announce: true,
    currentDate: '2026-09-01',
    lastAnnounced: '',
    events: structuredClone(DEFAULT_EVENTS),
};

function ctx() { return SillyTavern.getContext(); }

function settings() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = structuredClone(defaultSettings);
    for (const k of Object.keys(defaultSettings)) {
        if (es[MODULE][k] === undefined) es[MODULE][k] = structuredClone(defaultSettings[k]);
    }
    return es[MODULE];
}

function t() { return L10N[settings().lang] || L10N.en; }
function save() { ctx().saveSettingsDebounced(); }

function dateObj() {
    return new Date(settings().currentDate + 'T12:00:00');
}

function formatDate(d) {
    const loc = t();
    if (settings().lang === 'ru') {
        return `${loc.weekdays[d.getDay()]}, ${d.getDate()} ${loc.months[d.getMonth()]} ${d.getFullYear()} года`;
    }
    return `${loc.weekdays[d.getDay()]}, ${loc.months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function mmdd(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function shiftDate(days) {
    const d = dateObj();
    d.setDate(d.getDate() + days);
    settings().currentDate = d.toISOString().slice(0, 10);
    save();
    onDateChanged();
}

function todaysEvents() {
    const key = mmdd(dateObj());
    return settings().events.filter(e => e.date === key);
}

function upcomingEvents(withinDays = 21) {
    const s = settings();
    const base = dateObj();
    const result = [];
    for (let i = 1; i <= withinDays; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const key = mmdd(d);
        for (const e of s.events.filter(ev => ev.date === key)) {
            result.push({ ...e, inDays: i });
        }
    }
    return result;
}

function updateInjection() {
    const s = settings();
    const c = ctx();
    if (!s.enabled || !s.inject) {
        c.setExtensionPrompt(INJECT_KEY, '', 1, 4);
        return;
    }
    const loc = t();
    const parts = [loc.injectToday(formatDate(dateObj()))];
    for (const e of todaysEvents()) {
        parts.push(loc.injectEvent(e.name, e.prompt));
    }
    const upcoming = upcomingEvents();
    if (upcoming.length) {
        parts.push(loc.injectUpcoming);
        for (const e of upcoming.slice(0, 5)) {
            parts.push(`- ${e.name} (+${e.inDays}d): ${e.prompt}`);
        }
    }
    parts.push(loc.injectFooter);
    c.setExtensionPrompt(INJECT_KEY, parts.join('\n'), 1, 4);
}

async function announceIfNeeded() {
    const s = settings();
    if (!s.enabled || !s.announce) return;
    if (s.lastAnnounced === s.currentDate) return;
    const events = todaysEvents();
    if (!events.length) return;
    s.lastAnnounced = s.currentDate;
    save();
    for (const e of events) {
        const text = t().announceMsg(e.name, e.prompt).replace(/\|/g, '¦');
        await ctx().executeSlashCommandsWithOptions?.(`/sys compact=true ${text}`)
            ?? ctx().executeSlashCommands?.(`/sys compact=true ${text}`);
    }
}

function onDateChanged() {
    $('#scal_date_label').text(formatDate(dateObj()));
    $('#scal_date_input').val(settings().currentDate);
    updateInjection();
    announceIfNeeded();
}

function renderEvents() {
    const s = settings();
    const list = $('#scal_events').empty();
    const sorted = [...s.events].sort((a, b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
        const idx = s.events.indexOf(e);
        const row = $(`
            <div class="scal-event">
                <span class="scal-event-date">${e.date}</span>
                <span class="scal-event-name" title="${e.prompt}">${e.name}</span>
                <div class="menu_button scal-del" title="${t().remove}">🗑️</div>
            </div>`);
        row.find('.scal-del').on('click', () => {
            s.events.splice(idx, 1);
            save();
            renderEvents();
            updateInjection();
        });
        list.append(row);
    }
}

function renderPanel() {
    const s = settings();
    $('#scal_panel').remove();
    const loc = t();
    const html = `
    <div id="scal_panel" class="extension_container">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>${loc.title}</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label"><input type="checkbox" id="scal_enabled" ${s.enabled ? 'checked' : ''}><span>${loc.enabled}</span></label>
                <label class="checkbox_label"><input type="checkbox" id="scal_inject" ${s.inject ? 'checked' : ''}><span>${loc.inject}</span></label>
                <label class="checkbox_label"><input type="checkbox" id="scal_announce" ${s.announce ? 'checked' : ''}><span>${loc.announce}</span></label>
                <div class="scal-lang">
                    <span>${loc.language}:</span>
                    <select id="scal_lang" class="text_pole">
                        <option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option>
                        <option value="ru" ${s.lang === 'ru' ? 'selected' : ''}>Русский</option>
                    </select>
                </div>
                <div class="scal-today">
                    <b>${loc.today}:</b> <span id="scal_date_label"></span>
                </div>
                <div class="scal-controls">
                    <div class="menu_button" id="scal_prev">${loc.prevDay}</div>
                    <div class="menu_button" id="scal_next">${loc.nextDay}</div>
                    <div class="menu_button" id="scal_week">${loc.nextWeek}</div>
                    <input type="date" id="scal_date_input" class="text_pole" value="${s.currentDate}">
                    <div class="menu_button" id="scal_set">${loc.setDate}</div>
                </div>
                <hr>
                <b>${loc.events}</b>
                <div id="scal_events"></div>
                <div class="scal-add">
                    <input type="text" id="scal_new_date" class="text_pole scal-mmdd" placeholder="${loc.datePh}" maxlength="5">
                    <input type="text" id="scal_new_name" class="text_pole" placeholder="${loc.namePh}">
                </div>
                <textarea id="scal_new_prompt" class="text_pole" rows="2" placeholder="${loc.promptPh}"></textarea>
                <div class="menu_button" id="scal_add">${loc.addEvent}</div>
            </div>
        </div>
    </div>`;
    $('#extensions_settings2').append(html);

    $('#scal_enabled').on('change', function () { s.enabled = this.checked; save(); updateInjection(); });
    $('#scal_inject').on('change', function () { s.inject = this.checked; save(); updateInjection(); });
    $('#scal_announce').on('change', function () { s.announce = this.checked; save(); });
    $('#scal_lang').on('change', function () { s.lang = this.value; save(); renderPanel(); updateInjection(); });
    $('#scal_prev').on('click', () => shiftDate(-1));
    $('#scal_next').on('click', () => shiftDate(1));
    $('#scal_week').on('click', () => shiftDate(7));
    $('#scal_set').on('click', () => {
        const v = String($('#scal_date_input').val());
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            s.currentDate = v;
            s.lastAnnounced = '';
            save();
            onDateChanged();
        }
    });
    $('#scal_add').on('click', () => {
        const date = String($('#scal_new_date').val()).trim();
        const name = String($('#scal_new_name').val()).trim();
        const prompt = String($('#scal_new_prompt').val()).trim();
        if (!/^\d{2}-\d{2}$/.test(date) || !name) return;
        s.events.push({ date, name, prompt });
        $('#scal_new_date, #scal_new_name, #scal_new_prompt').val('');
        save();
        renderEvents();
        updateInjection();
    });
    renderEvents();
    onDateChanged();
}

jQuery(async () => {
    const c = ctx();
    renderPanel();
    updateInjection();
    c.eventSource.on(c.eventTypes.CHAT_CHANGED, updateInjection);
});
