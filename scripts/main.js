const sidebar = document.getElementById('sidebar');
const themeSwitch = document.getElementById('theme-switch');
let darkMode = localStorage.getItem('darkMode');

function toggleSidebar() {
    sidebar.classList.toggle('close');
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

themeSwitch.addEventListener('click', () => {
    darkMode = localStorage.getItem('darkMode');
    darkMode !== "active" ? enableDarkMode() : disableDarkMode();
});