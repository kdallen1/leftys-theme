class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
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
    this.getSectionsToRender().forEach((section) => {
      document.getElementById(section.id).innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    // Update shirt promotion after cart notification content is rendered
    setTimeout(() => {
      this.updateShirtPromotion(parsedState);
    }, 100);

    if (this.header) this.header.reveal();
    this.open();
  }

  updateShirtPromotion(cartData) {
    console.log('Updating cart notification shirt promotion');

    // Count shirts in the current cart
    const shirtCount = this.countShirtsInCart(cartData);
    this.displayPromotionMessage(shirtCount);
  }

  countShirtsInCart(cartData) {
    let shirtCount = 0;

    if (cartData && cartData.items) {
      cartData.items.forEach(item => {
        const isShirt = this.isShirtProduct(item);
        if (isShirt) {
          shirtCount += item.quantity;
        }
      });
    }

    console.log('Cart notification: Total shirt count:', shirtCount);
    return shirtCount;
  }

  isShirtProduct(item) {
    // Check if product belongs to shirts collection using various methods
    if (item.product_type && item.product_type.toLowerCase().includes('shirt')) {
      return true;
    }

    // Check collections if available
    if (item.collections) {
      return item.collections.some(collection =>
        collection.handle === 'shirts' ||
        collection.id === 478689722404 ||
        collection.handle === 'long-sleeve-western-shirts' ||
        collection.handle === 'fishing-shirts'
      );
    }

    // Check product handle for shirt-related keywords
    if (item.handle) {
      const shirtKeywords = ['duckpopper', 'neon-moon', 'black-on-black-luxe-pearl-snap'];
      return shirtKeywords.some(keyword => item.handle.toLowerCase().includes(keyword));
    }

    // Check product title for shirt-related keywords
    if (item.product_title) {
      const shirtKeywords = ['duckpopper', 'neon moon', 'pearl snap'];
      return shirtKeywords.some(keyword => item.product_title.toLowerCase().includes(keyword));
    }

    return false;
  }

  displayPromotionMessage(shirtCount) {
    console.log('Cart notification: Displaying promotion for shirt count:', shirtCount);

    const promotionSection = document.getElementById('cart-notification-shirt-promotion');
    const encourageMessage = document.getElementById('cart-notification-shirt-promotion-encourage');
    const congratulateMessage = document.getElementById('cart-notification-shirt-promotion-congratulate');

    if (!promotionSection || !encourageMessage || !congratulateMessage) {
      console.log('Cart notification promotion elements not found');
      return;
    }

    // Hide all messages first
    promotionSection.style.display = 'none';
    encourageMessage.style.display = 'none';
    congratulateMessage.style.display = 'none';

    if (shirtCount === 1) {
      // Show encouragement message for 1 shirt
      console.log('Cart notification: Showing encouragement message for 1 shirt');
      promotionSection.style.display = 'block';
      encourageMessage.style.display = 'block';
    } else if (shirtCount >= 2) {
      // Show congratulations message for 2+ shirts
      console.log('Cart notification: Showing congratulations message for', shirtCount, 'shirts');
      promotionSection.style.display = 'block';
      congratulateMessage.style.display = 'block';
    }
    // For 0 shirts, keep everything hidden
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
