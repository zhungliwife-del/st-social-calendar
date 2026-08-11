// Social Calendar & Events Engine — SillyTavern extension
// Keeps an in-RP date, injects "today on campus" + upcoming events into the prompt,
// and announces events in chat when the date lands on them. EN/RU UI.

const VERSION = '1.2.0';
const MODULE = 'st-social-calendar';
const INJECT_KEY = 'social_calendar';

const L10N = {
    en: {
        title: `📅 Social Calendar v${VERSION}`,
        enabled: 'Enabled',
        inject: 'Inject date & events into prompt',
        announce: 'Announce events in chat when the day arrives',
        popup: 'Popup notification when the day arrives',
        worldHolidays: 'Include base world holidays',
        universe: 'Universe events',
        profileUniversity: 'Hale University',
        profileVoodoo: 'Voodoo & Bayou',
        profileEmpty: 'Empty / custom only',
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
        builtIn: 'built-in',
        custom: 'custom',
        popupTitle: 'Calendar event',
        weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        injectToday: (d) => `[In-RP calendar: today is ${d}.`,
        injectEvent: (name, prompt) => `TODAY'S EVENT — ${name}: ${prompt} NPCs are aware of it and react accordingly.`,
        injectUpcoming: 'Upcoming events:',
        injectFooter: ']',
        announceMsg: (name, prompt) => `📅 <b>Today: ${name}</b><br>${prompt}`, 
    },
    ru: {
        title: `📅 Социальный календарь v${VERSION}`,
        enabled: 'Включено',
        inject: 'Внедрять дату и события в промпт',
        announce: 'Объявлять события в чате, когда наступает их день',
        popup: 'Всплывающее уведомление при наступлении дня',
        worldHolidays: 'Добавить базовые мировые праздники',
        universe: 'События вселенной',
        profileUniversity: 'Hale University',
        profileVoodoo: 'Voodoo & Bayou',
        profileEmpty: 'Пусто / только свои',
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
        builtIn: 'базовый',
        custom: 'свой',
        popupTitle: 'Событие календаря',
        weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
        months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
        injectToday: (d) => `[Внутриигровой календарь: сегодня ${d}.`,
        injectEvent: (name, prompt) => `СОБЫТИЕ СЕГОДНЯ — ${name}: ${prompt} NPC знают о нём и реагируют соответственно.`,
        injectUpcoming: 'Ближайшие события:',
        injectFooter: ']',
        announceMsg: (name, prompt) => `📅 <b>Сегодня: ${name}</b><br>${prompt}`, 
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

const DEFAULT_UNIVERSITY_EVENTS = DEFAULT_EVENTS;

const DEFAULT_VOODOO_EVENTS = [
    {
        date: '01-06',
        name: 'Carnival season opens in New Orleans',
        nameRu: 'Старт карнавального сезона в Новом Орлеане',
        prompt: 'King cakes, krewe planning, drunk tourists and crowded streets give both gangs cover for quiet meetings and risky moves.',
        promptRu: 'King cakes, подготовка крю, пьяные туристы и толпы на улицах дают обеим бандам прикрытие для тихих встреч и рискованных ходов.',
    },
    {
        date: '02-13',
        name: 'Zion Masquerade Night',
        nameRu: 'Маскарадная ночь в Club Zion',
        prompt: 'Club Zion hosts a masked pre-Mardi Gras night. Neutral-ground rules are tested while everyone hides behind masks.',
        promptRu: 'В Club Zion проходит маскарад перед Mardi Gras. Правила нейтральной территории трещат, пока все прячутся за масками.',
    },
    {
        date: '03-15',
        name: 'Truce Anniversary',
        nameRu: 'Годовщина перемирия',
        prompt: 'The fragile truce between Voodoo Boys and Bayou Crew is remembered with forced civility, old grief and quiet threats.',
        promptRu: 'Хрупкое перемирие Voodoo Boys и Bayou Crew вспоминают с натянутой вежливостью, старой болью и тихими угрозами.',
    },
    {
        date: '04-22',
        name: 'Port Authority Inspection Week',
        nameRu: 'Неделя проверок портовой администрации',
        prompt: 'Port inspections threaten Voodoo Boys shipments. Bribes, forged papers and sudden disappearances become urgent.',
        promptRu: 'Портовые проверки угрожают грузам Voodoo Boys. Взятки, поддельные бумаги и внезапные исчезновения становятся срочными.',
    },
    {
        date: '06-06',
        name: 'Bayou Memorial Night',
        nameRu: 'Ночь памяти в Байю',
        prompt: 'The Bayou Crew honors the dead from the old gang war. Loyalty speeches, drinking, grief and revenge talk fill the swamp.',
        promptRu: 'Bayou Crew поминает погибших в старой войне. Болото наполняется тостами за верность, горем и разговорами о мести.',
    },
    {
        date: '07-17',
        name: 'CASH Casino High-Roller Weekend',
        nameRu: 'Уикенд хайроллеров в CASH Casino',
        prompt: 'High rollers arrive at CASH Casino. Money laundering, private rooms, blackmail and polite threats are everywhere.',
        promptRu: 'В CASH Casino приезжают хайроллеры. Отмыв денег, частные комнаты, шантаж и вежливые угрозы — повсюду.',
    },
    {
        date: '08-09',
        name: 'Swamp Run',
        nameRu: 'Болотный прогон',
        prompt: 'Bayou Crew moves contraband through marsh routes. Outsiders get lost, phones die and the wrong boat can start a firefight.',
        promptRu: 'Bayou Crew гонит контрабанду через болотные маршруты. Чужие теряются, телефоны умирают, а не та лодка может начать перестрелку.',
    },
    {
        date: '09-15',
        name: 'City Heat Spike',
        nameRu: 'Всплеск городского давления',
        prompt: 'Rumors of federal attention and old debts circulate. Everyone checks loyalties, ledgers and escape routes.',
        promptRu: 'Ходят слухи о федеральном внимании и старых долгах. Все проверяют лояльность, бухгалтерию и пути отхода.',
    },
    {
        date: '10-31',
        name: 'Voodoo Night',
        nameRu: 'Ночь Вуду',
        prompt: 'Halloween gives the French Quarter masks, crowds and supernatural theater. The Voodoo Boys can move almost unseen.',
        promptRu: 'Хэллоуин даёт French Quarter маски, толпы и мистический театр. Voodoo Boys могут двигаться почти незаметно.',
    },
    {
        date: '11-02',
        name: 'All Souls Bayou Rite',
        nameRu: 'Байю-обряд на День всех душ',
        prompt: 'Candles, water, grief and old bargains return. The swamp remembers names the city tries to forget.',
        promptRu: 'Свечи, вода, скорбь и старые сделки возвращаются. Болото помнит имена, которые город пытается забыть.',
    },
    {
        date: '12-12',
        name: 'Zion Winter Summit',
        nameRu: 'Зимний саммит в Zion',
        prompt: 'Baron hosts a winter summit at Club Zion. Neutral territory fills with envoys, surveillance and offers no one can refuse.',
        promptRu: 'Барон проводит зимний саммит в Club Zion. Нейтральная территория заполняется посланниками, наблюдением и предложениями, от которых сложно отказаться.',
    },
];

const PROFILE_EVENTS = {
    university: DEFAULT_UNIVERSITY_EVENTS,
    voodoo: DEFAULT_VOODOO_EVENTS,
    empty: [],
};

const DEFAULT_WORLD_EVENTS = [
    {
        date: '01-01',
        name: "New Year's Day",
        nameRu: 'Новый год',
        prompt: 'New Year begins: fireworks, hangovers, resolutions, closed offices, and people checking who survived the night.',
        promptRu: 'Начинается новый год: фейерверки, похмелье, обещания начать заново, закрытые офисы и разговоры о том, кто пережил ночь.',
    },
    {
        date: '01-06',
        name: "King's Day / Carnival season begins",
        nameRu: 'День королей / старт карнавального сезона',
        prompt: 'Carnival season begins. In New Orleans, king cakes appear, krewes start preparing, and party energy creeps into the city.',
        promptRu: 'Начинается карнавальный сезон. В Новом Орлеане появляются king cakes, крю готовятся к парадам, город постепенно заряжается праздником.',
    },
    {
        date: '02-14',
        name: "Valentine's Day",
        nameRu: 'День святого Валентина',
        prompt: 'Valentine’s Day pushes romance, jealousy, dates, gifts, messy exes, and public couple drama into the foreground.',
        promptRu: 'День святого Валентина выводит на первый план романтику, ревность, свидания, подарки, бывших и публичные драмы пар.',
    },
    {
        date: '03-17',
        name: "St. Patrick's Day",
        nameRu: 'День святого Патрика',
        prompt: 'Bars are packed, green clothes are everywhere, drunk crowds spill into the streets, and opportunists use the chaos.',
        promptRu: 'Бары забиты, все в зелёном, пьяные толпы вываливаются на улицы, а те, кому выгоден хаос, пользуются моментом.',
    },
    {
        date: '04-01',
        name: "April Fools' Day",
        nameRu: 'День дурака',
        prompt: 'Pranks, fake rumors, staged scandals, and suspiciously convenient lies are everywhere today.',
        promptRu: 'Сегодня повсюду розыгрыши, фальшивые слухи, постановочные скандалы и слишком удобная ложь.',
    },
    {
        date: '05-01',
        name: 'May Day / International Workers’ Day',
        nameRu: 'Первомай / День труда',
        prompt: 'Labor marches, day-off energy, protests, and public gatherings can reshape the city’s rhythm today.',
        promptRu: 'Марши, выходной настрой, протесты и массовые собрания меняют ритм города.',
    },
    {
        date: '07-04',
        name: 'Independence Day',
        nameRu: 'День независимости США',
        prompt: 'Fireworks, police presence, crowded streets, rooftops, barbecues, and patriotic public events dominate the day.',
        promptRu: 'Фейерверки, усиленная полиция, толпы на улицах, крыши, барбекю и патриотические мероприятия задают тон дню.',
    },
    {
        date: '10-31',
        name: 'Halloween',
        nameRu: 'Хэллоуин',
        prompt: 'Costumes, masks, haunted parties, pranks, and easy anonymity make the night dangerous and dramatic.',
        promptRu: 'Костюмы, маски, вечеринки с хоррор-темой, розыгрыши и удобная анонимность делают ночь опасной и драматичной.',
    },
    {
        date: '11-11',
        name: 'Veterans Day / Remembrance Day',
        nameRu: 'День ветеранов / День памяти',
        prompt: 'Memorial events, uniforms, old war stories, grief, pride, and public ceremonies surface today.',
        promptRu: 'Сегодня всплывают памятные мероприятия, форма, старые военные истории, гордость, скорбь и публичные церемонии.',
    },
    {
        date: '12-24',
        name: 'Christmas Eve',
        nameRu: 'Сочельник',
        prompt: 'Families gather, last-minute gifts move through the city, churches fill up, and lonely people feel the holiday pressure hardest.',
        promptRu: 'Семьи собираются, город живёт последними подарками, церкви заполняются, а одинокие сильнее всего чувствуют давление праздника.',
    },
    {
        date: '12-25',
        name: 'Christmas Day',
        nameRu: 'Рождество',
        prompt: 'Christmas quiets the city in some places and intensifies family drama in others: gifts, dinners, absences, grudges, and reconciliations.',
        promptRu: 'Рождество где-то затихает город, а где-то усиливает семейные драмы: подарки, ужины, отсутствующие люди, обиды и примирения.',
    },
    {
        date: '12-31',
        name: "New Year's Eve",
        nameRu: 'Канун Нового года',
        prompt: 'The city parties hard: countdowns, champagne, fireworks, packed clubs, dangerous roads, and last decisions before midnight.',
        promptRu: 'Город празднует на полную: обратный отсчёт, шампанское, фейерверки, забитые клубы, опасные дороги и последние решения до полуночи.',
    },
];

const defaultSettings = {
    lang: 'en',
    enabled: true,
    inject: true,
    announce: true,
    popup: true,
    worldHolidays: true,
    calendarProfile: 'university',
    currentDate: '2026-09-01',
    lastAnnounced: '',
    events: [],
};

function ctx() { return SillyTavern.getContext(); }

function settings() {
    const es = ctx().extensionSettings;
    if (!es[MODULE]) es[MODULE] = structuredClone(defaultSettings);
    for (const k of Object.keys(defaultSettings)) {
        if (es[MODULE][k] === undefined) es[MODULE][k] = structuredClone(defaultSettings[k]);
    }
    if (!PROFILE_EVENTS[es[MODULE].calendarProfile]) es[MODULE].calendarProfile = 'university';
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

function eventName(e) {
    return settings().lang === 'ru' && e.nameRu ? e.nameRu : e.name;
}

function eventPrompt(e) {
    return settings().lang === 'ru' && e.promptRu ? e.promptRu : e.prompt;
}

function allEvents() {
    const s = settings();
    const profileEvents = (PROFILE_EVENTS[s.calendarProfile] || []).map(e => ({ ...e, builtin: true, profile: s.calendarProfile }));
    const holidays = s.worldHolidays ? DEFAULT_WORLD_EVENTS.map(e => ({ ...e, builtin: true, profile: 'world' })) : [];
    const custom = s.events.map((e, customIndex) => ({ ...e, customIndex }));
    const seen = new Set();
    return [...profileEvents, ...holidays, ...custom].filter(e => {
        const key = `${e.date}|${eventName(e)}|${eventPrompt(e)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
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
    return allEvents().filter(e => e.date === key);
}

function upcomingEvents(withinDays = 21) {
    const s = settings();
    const base = dateObj();
    const result = [];
    for (let i = 1; i <= withinDays; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const key = mmdd(d);
        for (const e of allEvents().filter(ev => ev.date === key)) {
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
        parts.push(loc.injectEvent(eventName(e), eventPrompt(e)));
    }
    const upcoming = upcomingEvents();
    if (upcoming.length) {
        parts.push(loc.injectUpcoming);
        for (const e of upcoming.slice(0, 5)) {
            parts.push(`- ${eventName(e)} (+${e.inDays}d): ${eventPrompt(e)}`);
        }
    }
    parts.push(loc.injectFooter);
    c.setExtensionPrompt(INJECT_KEY, parts.join('\n'), 1, 4);
}

async function announceIfNeeded() {
    const s = settings();
    if (!s.enabled || (!s.announce && !s.popup)) return;
    if (s.lastAnnounced === s.currentDate) return;
    const events = todaysEvents();
    if (!events.length) return;
    s.lastAnnounced = s.currentDate;
    save();
    for (const e of events) {
        const name = eventName(e);
        const prompt = eventPrompt(e);
        if (s.popup) toastr.info(prompt, `${t().popupTitle}: ${name}`, { timeOut: 9000, extendedTimeOut: 3000 });
        if (s.announce) {
            const text = t().announceMsg(name, prompt).replace(/\|/g, '¦');
            await ctx().executeSlashCommandsWithOptions?.(`/sys compact=true ${text}`)
                ?? ctx().executeSlashCommands?.(`/sys compact=true ${text}`);
        }
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
    const sorted = [...allEvents()].sort((a, b) => a.date.localeCompare(b.date) || eventName(a).localeCompare(eventName(b)));
    for (const e of sorted) {
        const idx = e.customIndex;
        const row = $(`
            <div class="scal-event ${e.builtin ? 'scal-builtin' : ''}">
                <span class="scal-event-date">${e.date}</span>
                <span class="scal-event-name" title="${eventPrompt(e)}">${eventName(e)}</span>
                <span class="scal-badge">${e.builtin ? t().builtIn : t().custom}</span>
                ${e.builtin ? '' : `<div class="menu_button scal-del" title="${t().remove}">🗑️</div>`}
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
                <label class="checkbox_label"><input type="checkbox" id="scal_popup" ${s.popup ? 'checked' : ''}><span>${loc.popup}</span></label>
                <label class="checkbox_label"><input type="checkbox" id="scal_world" ${s.worldHolidays ? 'checked' : ''}><span>${loc.worldHolidays}</span></label>
                <div class="scal-lang">
                    <span>${loc.universe}:</span>
                    <select id="scal_profile" class="text_pole">
                        <option value="voodoo" ${s.calendarProfile === 'voodoo' ? 'selected' : ''}>${loc.profileVoodoo}</option>
                        <option value="university" ${s.calendarProfile === 'university' ? 'selected' : ''}>${loc.profileUniversity}</option>
                        <option value="empty" ${s.calendarProfile === 'empty' ? 'selected' : ''}>${loc.profileEmpty}</option>
                    </select>
                </div>
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
    $('#scal_popup').on('change', function () { s.popup = this.checked; save(); });
    $('#scal_world').on('change', function () { s.worldHolidays = this.checked; save(); renderEvents(); updateInjection(); announceIfNeeded(); });
    $('#scal_profile').on('change', function () { s.calendarProfile = this.value; s.lastAnnounced = ''; save(); renderEvents(); updateInjection(); announceIfNeeded(); });
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
