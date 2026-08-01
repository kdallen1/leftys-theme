class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    // Only the close (X) and "continue shopping" buttons dismiss the popup —
    // the quantity stepper buttons must not.
    this.querySelectorAll('.cart-notification__close, .button-label').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );

    // The quantity stepper lives inside the re-rendered product markup, so use
    // event delegation on the persistent notification element.
    this.productContainer = document.getElementById('cart-notification-product');

    this.addEventListener('click', (event) => {
      const button = event.target.closest('.cart-notification__quantity-button');
      if (!button) return;
      const input = this.querySelector('.cart-notification__quantity-input');
      if (!input) return;
      const current = parseInt(input.value, 10) || 1;
      const next = button.dataset.quantityAction === 'plus' ? current + 1 : current - 1;
      if (next < 1) return;
      this.updateQuantity(next);
    });

    this.addEventListener('change', (event) => {
      if (!event.target.classList.contains('cart-notification__quantity-input')) return;
      const value = parseInt(event.target.value, 10);
      this.updateQuantity(!value || value < 1 ? 1 : value);
    });
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    this.cartItemKey = parsedState.key;
    this.variantId = parsedState.variant_id || parsedState.id;
    // Skip anything the server did not return rather than throwing — a single
    // missing section must not stop the notification from opening.
    this.getSectionsToRender().forEach((section) => {
      const element = document.getElementById(section.id);
      if (!element || !parsedState.sections || !parsedState.sections[section.id]) return;
      try {
        element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      } catch (e) {
        console.error('cart-notification: failed to render section', section.id, e);
      }
    });

    if (this.header) this.header.reveal();
    this.open();
  }

  // Reads the cart so the quantity stepper can resolve a line index.
  //
  // Keep the URL exactly '/cart.js'. A cache-busting query param (/cart.js?t=…)
  // does NOT return this session's cart — it comes back empty. Use the cache
  // option instead: 'no-store' avoids a stale snapshot without changing the URL.
  async fetchCart() {
    const response = await fetch('/cart.js', { cache: 'no-store' });
    if (!response.ok) throw new Error(`cart-notification: /cart.js responded ${response.status}`);
    return response.json();
  }

  updateQuantity(quantity) {
    if (!this.cartItemKey) return;
    if (this.productContainer) this.productContainer.classList.add('is-loading');

    // Resolve the item's current line index from the live cart. Line-item keys
    // can go stale, so identifying by line (Dawn's approach) is reliable both
    // when increasing and decreasing quantity.
    this.fetchCart()
      .then((cart) => {
        let line = cart.items.findIndex((item) => item.key === this.cartItemKey);
        if (line === -1) line = cart.items.findIndex((item) => item.variant_id === this.variantId);
        if (line === -1) throw new Error('cart-notification: could not locate line item to update');

        const config = fetchConfig('json');
        config.body = JSON.stringify({
          line: line + 1,
          quantity,
          sections: this.getSectionsToRender().map((section) => section.id),
          sections_url: window.location.pathname,
        });
        return fetch(`${routes.cart_change_url}`, config);
      })
      .then((response) => response.json())
      .then((parsedState) => {
        // Keep the key fresh in case it changed.
        const updatedItem =
          (parsedState.items || []).find((item) => item.variant_id === this.variantId) ||
          (parsedState.items || []).find((item) => item.key === this.cartItemKey);
        if (updatedItem) this.cartItemKey = updatedItem.key;

        this.getSectionsToRender().forEach((section) => {
          const element = document.getElementById(section.id);
          if (!element || !parsedState.sections || !parsedState.sections[section.id]) return;
          try {
            element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
          } catch (e) {
            console.error('cart-notification: failed to render section', section.id, e);
          }
        });

        // Sync the displayed number to the authoritative server quantity.
        const input = this.querySelector('.cart-notification__quantity-input');
        if (input) input.value = updatedItem ? updatedItem.quantity : quantity;

        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-notification', cartData: parsedState });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (this.productContainer) this.productContainer.classList.remove('is-loading');
      });
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
      },
      {
        id: 'cart-notification-button',
      },
      {
        id: 'cart-notification-promotion',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
