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