document.addEventListener('DOMContentLoaded', function () {
    const progressBar = document.getElementById('scroll-progress-bar');

    if (progressBar) {
        window.addEventListener('scroll', function () {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercentage = (scrollTop / scrollHeight) * 100;

            progressBar.style.width = scrollPercentage + '%';
        });
    }
});
