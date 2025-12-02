class ImageCarousel {
  constructor(container) {
    this.container = container;
    this.slides = container.querySelectorAll('.carousel__slide');
    this.dots = container.querySelectorAll('.carousel__dot');
    this.prevButton = container.querySelector('.carousel__nav--prev');
    this.nextButton = container.querySelector('.carousel__nav--next');

    this.currentIndex = 0;
    this.autoplayTimer = null;
    this.restartTimeout = null;
    this.isAutoplay = container.dataset.autoplay === 'true';
    this.autoplaySpeed = parseInt(container.dataset.autoplaySpeed) * 1000 || 5000;

    this.init();
  }

  init() {
    if (this.slides.length <= 1) return;

    this.bindEvents();

    if (this.isAutoplay) {
      this.startAutoplay();
      this.bindAutoplayEvents();
    }
  }

  bindEvents() {
    // Navigation buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => {
        this.resetAutoplay();
        this.goToPrevious();
      });
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => {
        this.resetAutoplay();
        this.goToNext();
      });
    }

    // Dot indicators
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.pauseAutoplay();
        this.clearRestartTimeout();
        this.goToSlide(index);
        if (this.isAutoplay) {
          this.restartTimeout = setTimeout(() => {
            this.startAutoplay();
          }, 3000); // Wait 3 seconds before restarting autoplay
        }
      });
    });

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.resetAutoplay();
        this.goToPrevious();
      } else if (e.key === 'ArrowRight') {
        this.resetAutoplay();
        this.goToNext();
      }
    });

    // Touch/swipe support
    this.bindTouchEvents();
  }

  bindTouchEvents() {
    let startX = null;
    let startY = null;
    const threshold = 50;

    this.container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    this.container.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;

      // Only respond to horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          this.resetAutoplay();
          this.goToNext();
        } else {
          this.resetAutoplay();
          this.goToPrevious();
        }
      }

      startX = null;
      startY = null;
    });
  }

  bindAutoplayEvents() {
    // Pause on hover
    this.container.addEventListener('mouseenter', () => {
      this.pauseAutoplay();
    });

    this.container.addEventListener('mouseleave', () => {
      if (this.isAutoplay) {
        this.startAutoplay();
      }
    });

    // Pause when page is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAutoplay();
      } else if (this.isAutoplay) {
        this.startAutoplay();
      }
    });
  }

  goToSlide(index) {
    if (index === this.currentIndex) return;

    // Remove active class from current slide and dot
    this.slides[this.currentIndex].classList.remove('carousel__slide--active');
    if (this.dots[this.currentIndex]) {
      this.dots[this.currentIndex].classList.remove('carousel__dot--active');
    }

    // Update current index
    this.currentIndex = index;

    // Add active class to new slide and dot
    this.slides[this.currentIndex].classList.add('carousel__slide--active');
    if (this.dots[this.currentIndex]) {
      this.dots[this.currentIndex].classList.add('carousel__dot--active');
    }

    // Update aria attributes
    this.updateAriaAttributes();
  }

  goToNext() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  goToPrevious() {
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex);
  }

  startAutoplay() {
    if (!this.isAutoplay || this.slides.length <= 1) return;

    // Don't create a new timer if one is already running
    if (this.autoplayTimer) return;

    this.autoplayTimer = setInterval(() => {
      this.goToNext();
    }, this.autoplaySpeed);
  }

  pauseAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  clearRestartTimeout() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  resetAutoplay() {
    if (!this.isAutoplay) return;
    this.pauseAutoplay();
    this.startAutoplay();
  }

  updateAriaAttributes() {
    this.slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', index !== this.currentIndex);
    });

    if (this.prevButton) {
      this.prevButton.setAttribute('aria-label', `Previous slide (${this.currentIndex + 1} of ${this.slides.length})`);
    }

    if (this.nextButton) {
      this.nextButton.setAttribute('aria-label', `Next slide (${this.currentIndex + 1} of ${this.slides.length})`);
    }
  }
}

// Initialize all carousels on the page
document.addEventListener('DOMContentLoaded', () => {
  const carousels = document.querySelectorAll('[id^="Carousel-"]');
  carousels.forEach(carousel => {
    new ImageCarousel(carousel);
  });
});

// Initialize carousels that are added dynamically (e.g., via AJAX)
if (typeof window.Shopify !== 'undefined' && window.Shopify.theme) {
  document.addEventListener('shopify:section:load', (event) => {
    const carousel = event.target.querySelector('[id^="Carousel-"]');
    if (carousel) {
      new ImageCarousel(carousel);
    }
  });
}