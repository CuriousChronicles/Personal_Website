const sidebar = document.getElementById('sidebar');
const themeSwitch = document.getElementById('theme-switch');
let darkMode = localStorage.getItem('darkMode');

function toggleSidebar() {
    sidebar.classList.toggle('close');

    if (sidebar.classList.contains('close')) {
        localStorage.setItem('sidebarState', 'close');
    } else {
        localStorage.setItem('sidebarState', 'open');
    }
}

/* hadnle case where the screensize is too small to fit the sidebar and main content side by side */
if (window.innerWidth < 750) {
    sidebar.classList.add('close');
    localStorage.setItem('sidebarState', 'close');
}

if (localStorage.getItem('sidebarState') === 'close') {
    sidebar.classList.add('close');
}

const enableDarkMode = () => {
    document.body.classList.add('darkmode');
    localStorage.setItem('darkMode', 'active');
    darkMode = "active";
}

const disableDarkMode = () => {
    document.body.classList.remove('darkmode');
    localStorage.setItem('darkMode', null);
    darkMode = "inactive";
}

if (darkMode === "active") {
    enableDarkMode();
}

themeSwitch.addEventListener('click', () => {
    darkMode = localStorage.getItem('darkMode');
    darkMode !== "active" ? enableDarkMode() : disableDarkMode();
});

/* Project Filter */
const filterBtns = document.querySelectorAll('.filter-btn');
if (filterBtns.length) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            document.querySelectorAll('.project_item').forEach(card => {
                const categories = card.dataset.category || '';
                const matches = filter === 'all' || categories.includes(filter);
                if (matches) {
                    card.style.display = '';
                    requestAnimationFrame(() => card.classList.remove('hidden'));
                } else {
                    card.classList.add('hidden');
                    setTimeout(() => { card.style.display = 'none'; }, 300);
                }
            });
        });
    });
}

/* Scroll Reveal */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.revealDelay || 0;
            setTimeout(() => entry.target.classList.add('visible'), delay);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.10 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* Contact Form */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: new FormData(contactForm)
        });
        const json = await res.json();
        if (json.success) {
            contactForm.classList.add('hidden');
            document.getElementById('thank-you').classList.remove('hidden');
        }
    });
}

/* Pi Desk Terminal */
const piForm = document.getElementById('pi-form');
if (piForm) {
    /* [on, off] milliseconds per flash. Keep in step with PATTERNS in pi/listener.py. */
    const PI_PATTERNS = {
        wave: Array(3).fill([500, 500]),
        heart: Array(3).fill([[150, 150], [150, 600]]).flat(),
        party: Array(12).fill([80, 80]),
        message: Array(3).fill([300, 300])
    };
    const POKE_LABELS = { wave: 'waved', heart: 'sent a heart', party: 'started a party' };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const piLed = document.getElementById('pi-led');
    const piLog = document.getElementById('pi-log');
    const piOnline = document.getElementById('pi-online');
    const piOnlineText = piOnline.querySelector('.pi-online-text');
    const piLastSeen = document.getElementById('pi-last-seen');
    const piBlinks = document.getElementById('pi-blinks');
    const pokeButtons = document.querySelectorAll('.pi-poke');
    let lastSeen = null;
    let isOnline = false;
    let statusKnown = false;
    let playing = false;
    let playToken = 0;

    const logLine = (text, kind) => {
        const li = document.createElement('li');
        li.textContent = text;
        if (kind) li.className = `pi-log-${kind}`;
        piLog.querySelector('.pi-log-dim:only-child')?.remove();
        piLog.appendChild(li);
        while (piLog.children.length > 12) piLog.firstElementChild.remove();
        piLog.scrollTop = piLog.scrollHeight;
    };

    /* Plays a pattern on the drawn LED, cancelling whatever was playing. */
    const playPattern = (pattern) => {
        const token = ++playToken;
        let i = 0;
        playing = true;
        const step = () => {
            if (token !== playToken) return;
            if (i >= pattern.length) {
                piLed.classList.remove('on');
                playing = false;
                return;
            }
            const [on, off] = pattern[i++];
            piLed.classList.add('on');
            setTimeout(() => {
                if (token !== playToken) return;
                piLed.classList.remove('on');
                setTimeout(step, off);
            }, on);
        };
        step();
    };

    const timeAgo = (ms) => {
        const s = Math.max(0, Math.round(ms / 1000));
        if (s < 60) return `${s}s ago`;
        const m = Math.round(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.round(m / 60);
        return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
    };

    const renderStatus = () => {
        if (!statusKnown) return;
        piOnline.classList.toggle('online', isOnline);
        piOnline.classList.toggle('offline', !isOnline && lastSeen !== undefined);
        piOnlineText.textContent = lastSeen === undefined ? 'unknown' : isOnline ? 'online' : 'offline';
        piLastSeen.textContent = lastSeen ? timeAgo(Date.now() - lastSeen) : '-';
    };

    const refreshStatus = async () => {
        try {
            const res = await fetch('/api/status');
            if (!res.ok) throw new Error(res.status);
            const status = await res.json();
            lastSeen = status.lastSeen;
            isOnline = status.online;
            piBlinks.textContent = status.blinks.toLocaleString();
        } catch {
            lastSeen = undefined;
            isOnline = false;
        }
        statusKnown = true;
        renderStatus();
    };

    const send = async (payload, describe) => {
        logLine(describe, 'cmd');
        pokeButtons.forEach(b => b.disabled = true);
        try {
            const res = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    name: piForm.elements.name.value,
                    website: piForm.elements.website.value
                })
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.ok) {
                playPattern(PI_PATTERNS[payload.poke || 'message']);
                logLine(isOnline
                    ? 'queued. the real LED blinks within ~10s'
                    : 'queued. the Pi is offline, so it will blink when it wakes up', 'ok');
                return true;
            }
            logLine(res.status === 429
                ? 'error: too many pokes, try again in a minute'
                : `error: ${json.error || 'something went wrong, try again'}`, 'err');
        } catch {
            logLine('error: could not reach the server', 'err');
        } finally {
            pokeButtons.forEach(b => b.disabled = false);
        }
        return false;
    };

    pokeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const poke = btn.dataset.poke;
            send({ poke }, `blink --pattern ${poke}   # ${POKE_LABELS[poke]}`);
        });
    });

    piForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = piForm.elements.message;
        const message = input.value.trim();
        if (!message) {
            input.focus();
            return;
        }
        if (await send({ message }, `say "${message}"`)) input.value = '';
    });

    /* The real ACT LED flickers with disk activity; a faint idle flicker makes the drawing feel alive. */
    if (!reducedMotion) {
        setInterval(() => {
            if (isOnline && !playing && Math.random() < 0.35) {
                playPattern([[60, 0]]);
            }
        }, 1500);
    }

    refreshStatus();
    setInterval(() => {
        if (!document.hidden) refreshStatus();
    }, 20000);
    setInterval(renderStatus, 1000);
}
