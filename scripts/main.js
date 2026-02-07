document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle_btn');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('close');
        mainContent.classList.toggle('expanded');
    });
});