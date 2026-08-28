let currentSlide = 1;
const totalSlides = 3;

function updateSlideView() {
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));

    setTimeout(() => {
        document.getElementById(`slide${currentSlide}`).classList.add('active');
    }, 30);
    document.querySelectorAll('.dot')[currentSlide - 1].classList.add('active');

    const container = document.getElementById('mainContainer');
    const nextBtn = document.getElementById('nextBtn');
    const skipOrBackBtn = document.getElementById('skipOrBackBtn');
    const progressBar = document.getElementById('progressBar');

    container.classList.remove('theme-blue', 'theme-red', 'theme-green');

    if (currentSlide === 1) {
        container.classList.add('theme-blue');
        skipOrBackBtn.innerHTML = '<i class="fa-solid fa-forward-step me-1"></i> تخطي';
        nextBtn.innerHTML = '<span>التالي</span> <i class="fa-solid fa-arrow-left"></i>';
        progressBar.style.width = '33.33%';
    } else if (currentSlide === 2) {
        container.classList.add('theme-red');
        skipOrBackBtn.innerHTML = '<i class="fa-solid fa-arrow-right me-1"></i> رجوع';
        nextBtn.innerHTML = '<span>التالي</span> <i class="fa-solid fa-arrow-left"></i>';
        progressBar.style.width = '66.66%';
    } else if (currentSlide === 3) {
        container.classList.add('theme-green');
        skipOrBackBtn.innerHTML = '<i class="fa-solid fa-arrow-right me-1"></i> رجوع';
        nextBtn.innerHTML = '<span>ابدأ الآن</span> <i class="fa-solid fa-rocket"></i>';
        progressBar.style.width = '100%';
    }
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideView();
    } else {
        const container = document.getElementById('mainContainer');
        container.style.transform = 'scale(0.96)';
        container.style.opacity = '0.8';

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
    }
}

function handleBackOrSkip() {
    if (currentSlide === 1) {
        const container = document.getElementById('mainContainer');
        container.style.transform = 'scale(0.96)';
        container.style.opacity = '0.8';

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 300);
    } else {
        currentSlide--;
        updateSlideView();
    }
}

function goToSlide(slideNum) {
    currentSlide = slideNum;
    updateSlideView();
}

// Touch swipe support
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && currentSlide < totalSlides) {
            nextSlide();
        } else if (diff < 0 && currentSlide > 1) {
            handleBackOrSkip();
        }
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handleBackOrSkip();
    }
});
