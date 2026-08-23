let currentSlide = 1;
const totalSlides = 3;

function updateSlideView() {
    // Hide all slides
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));

    // Show current slide
    document.getElementById(`slide${currentSlide}`).classList.add('active');
    document.querySelectorAll('.dot')[currentSlide - 1].classList.add('active');

    const container = document.getElementById('mainContainer');
    const nextBtn = document.getElementById('nextBtn');
    const skipOrBackBtn = document.getElementById('skipOrBackBtn');

    // Remove old themes
    container.classList.remove('theme-blue', 'theme-red', 'theme-green');

    if (currentSlide === 1) {
        container.classList.add('theme-blue');
        skipOrBackBtn.textContent = 'تخطي';
        nextBtn.innerHTML = 'Next <i class="fa-solid fa-chevron-left"></i>';
    } else if (currentSlide === 2) {
        container.classList.add('theme-red');
        skipOrBackBtn.textContent = '< Back';
        nextBtn.innerHTML = 'Next <i class="fa-solid fa-chevron-left"></i>';
    } else if (currentSlide === 3) {
        container.classList.add('theme-green');
        skipOrBackBtn.textContent = '< Back';
        nextBtn.innerHTML = 'ابدأ الآن <i class="fa-solid fa-chevron-left"></i>';
    }
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideView();
    } else {
        // التحويل لصفحة التسجيل index.html عند الضغط على "ابدأ الآن"
        window.location.href = 'login.html';
    }
}

function handleBackOrSkip() {
    if (currentSlide === 1) {
        // تخطي الشاشات ومباشرة لـ index.html
        window.location.href = 'login.html';
    } else {
        currentSlide--;
        updateSlideView();
    }
}

function goToSlide(slideNum) {
    currentSlide = slideNum;
    updateSlideView();
}
