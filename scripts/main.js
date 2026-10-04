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

/* Pi Message Form */
const piForm = document.getElementById('pi-form');
if (piForm) {
    const piStatus = document.getElementById('pi-status');
    const piButton = piForm.querySelector('button[type="submit"]');

    piForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        piStatus.classList.remove('success');
        piStatus.textContent = 'Sending...';
        piButton.disabled = true;

        try {
            const res = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(piForm)))
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.ok) {
                piForm.reset();
                piStatus.classList.add('success');
                piStatus.textContent = 'Sent! My desk just lit up.';
            } else if (res.status === 429) {
                piStatus.textContent = 'Slow down a little, try again in a minute.';
            } else {
                piStatus.textContent = json.error || 'Something went wrong, please try again.';
            }
        } catch {
            piStatus.textContent = 'Could not reach the server, please try again.';
        } finally {
            piButton.disabled = false;
        }
    });
}
