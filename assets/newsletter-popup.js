class NewsletterPopup extends HTMLElement {
  constructor() {
    super();
    this.dialog = this.querySelector('.newsletter-popup');
    this.storageKey = this.dataset.storageKey || 'newsletter-popup:v1';
    this.scrollPercentage = parseInt(this.dataset.scrollPercentage, 10) || 50;
    this.redisplayDays = parseInt(this.dataset.redisplayDays, 10);
    this.delay = (parseInt(this.dataset.delay, 10) || 0) * 1000;
    // The success message is always in the DOM; it counts as "posted" only when
    // the server rendered it visible (the no-JS / native fallback submit path,
    // which reloads the page). Errors likewise reload and render their marker.
    const successEl = this.querySelector('[data-popup-success]');
    this.postedSuccess = !!successEl && !successEl.hasAttribute('hidden');
    this.hasErrors = !!this.querySelector('[data-popup-error]');
    this.form = this.querySelector('form');

    this.onScroll = this.onScroll.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.open = this.open.bind(this);
    this.dismiss = this.dismiss.bind(this);
  }

  connectedCallback() {
    if (!this.dialog) return;

    this.dialog
      .querySelectorAll('[data-popup-close]')
      .forEach((el) => el.addEventListener('click', this.dismiss));

    // Submit over fetch so the popup can show progress and confirmation
    // inline — no full-page reload, no scroll jump on close.
    if (this.form) this.form.addEventListener('submit', this.onSubmit);

    // Theme editor: open/close as the merchant selects the section.
    if (window.Shopify && window.Shopify.designMode) {
      document.addEventListener('shopify:section:select', (e) => {
        if (e.detail && e.target.contains(this)) this.open();
      });
      document.addEventListener('shopify:section:deselect', (e) => {
        if (e.target.contains(this)) this.close();
      });
      return;
    }

    // A successful signup reloads the page — reopen to show the confirmation
    // and make sure it never shows again.
    if (this.postedSuccess) {
      this.setState({ subscribed: true });
      if (this.form) this.form.classList.add('is-success');
      this.clearAnchorJump();
      this.open();
      return;
    }

    // A submit with errors also reloads — reopen so the visitor can retry.
    if (this.hasErrors) {
      this.clearAnchorJump();
      this.open();
      return;
    }

    if (!this.shouldShow()) return;

    this.armTimer = window.setTimeout(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }, this.delay);
  }

  shouldShow() {
    const state = this.getState();
    if (state.subscribed) return false;
    if (state.dismissedAt && this.redisplayDays > 0) {
      const elapsed = Date.now() - state.dismissedAt;
      if (elapsed < this.redisplayDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  }

  onScroll() {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
    if (percent >= this.scrollPercentage) {
      window.removeEventListener('scroll', this.onScroll);
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.lastFocused = document.activeElement;
    this.dialog.removeAttribute('hidden');
    // Force a reflow so the transition runs after `hidden` is removed.
    void this.dialog.offsetWidth;
    this.dialog.classList.add('is-open');
    document.body.classList.add('newsletter-popup-open');
    document.addEventListener('keydown', this.onKeydown);

    const focusTarget =
      this.dialog.querySelector('input[type="email"]') ||
      this.dialog.querySelector('[data-popup-close]');
    if (focusTarget) focusTarget.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.dialog.classList.remove('is-open');
    document.body.classList.remove('newsletter-popup-open');
    document.removeEventListener('keydown', this.onKeydown);
    window.setTimeout(() => this.dialog.setAttribute('hidden', ''), 300);
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus();
    }
  }

  dismiss(event) {
    if (event) event.preventDefault();
    const state = this.getState();
    if (!state.subscribed) this.setState({ dismissedAt: Date.now() });
    this.close();
  }

  onSubmit() {
    // Submit natively (do NOT preventDefault): Shopify's invisible spam
    // protection injects its reCAPTCHA token during a real form submit, so it
    // passes silently. Intercepting with fetch strips that token and forces a
    // visible captcha challenge. We only add a loading state so the wait shows
    // progress; the page reloads into the success/error state.
    //
    // Do not disable any fields here — native submission serializes them AFTER
    // this handler runs, and a disabled field would be dropped from the POST.
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.form.classList.add('is-loading');
  }

  // Shopify appends "#contact_form" to the URL after a customer form submit,
  // which makes the browser scroll to the footer "stay in touch" signup. Strip
  // it and return to the top so closing the popup doesn't dump the visitor at
  // the bottom of the page.
  clearAnchorJump() {
    if (window.location.hash) {
      const clean = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', clean);
    }
    window.scrollTo(0, 0);
  }

  onKeydown(event) {
    if (event.key === 'Escape') {
      this.dismiss(event);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = this.dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  getState() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch (e) {
      return {};
    }
  }

  setState(patch) {
    try {
      const next = { ...this.getState(), ...patch };
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch (e) {
      // Storage unavailable (private mode / disabled) — fail quietly.
    }
  }
}

customElements.define('newsletter-popup', NewsletterPopup);
