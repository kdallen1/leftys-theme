class HeaderTransparency {
  constructor() {
    this.header = document.querySelector('sticky-header.header-wrapper');
    this.threshold = 50; // When to switch from transparent to solid
    this.isHomePage = window.location.pathname === '/' || window.location.pathname === '';

    this.init();
  }

  init() {
    if (!this.header) return;

    // Only use transparent header on home page
    if (this.isHomePage) {
      // Mark as home page
      document.body.classList.add('is-home-page');

      // Start with transparent header
      this.header.classList.add('header--transparent');
      this.header.classList.remove('header--scrolled');

      // Simple scroll listener
      window.addEventListener('scroll', () => {
        this.handleScroll();
      }, { passive: true });

      // Initial check
      this.handleScroll();
    } else {
      // Mark as non-home page for CSS targeting
      document.body.classList.add('is-non-home-page');

      // For all other pages, use solid header immediately
      this.header.classList.remove('header--transparent');
      this.header.classList.add('header--scrolled');
    }
  }

  handleScroll() {
    const scrollY = window.scrollY;
    
    // Switch header appearance
    if (scrollY > this.threshold) {
      this.header.classList.remove('header--transparent');
      this.header.classList.add('header--scrolled');
    } else {
      this.header.classList.add('header--transparent');
      this.header.classList.remove('header--scrolled');
    }
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new HeaderTransparency());
} else {
  new HeaderTransparency();
}