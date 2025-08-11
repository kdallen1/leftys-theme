class HeaderTransparency {
  constructor() {
    this.header = document.querySelector('sticky-header.header-wrapper');
    this.threshold = 50; // When to switch from transparent to solid
    
    this.init();
  }

  init() {
    if (!this.header) return;
    
    // Always start with transparent header
    this.header.classList.add('header--transparent');
    this.header.classList.remove('header--scrolled');
    
    // Simple scroll listener
    window.addEventListener('scroll', () => {
      this.handleScroll();
    }, { passive: true });
    
    // Initial check
    this.handleScroll();
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