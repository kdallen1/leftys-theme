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

  async updateShirtPromotion(cartData) {
    console.log('Updating cart notification shirt promotion');
    console.log('Item that was just added:', cartData);

    // Check if the just-added item is a shirt
    const justAddedIsShirt = cartData ? this.isShirtProduct(cartData) : false;
    console.log('Just added item is shirt?', justAddedIsShirt);

    // Get the total shirt count in the cart by fetching current cart
    const totalShirtCount = await this.getTotalShirtCountInCart(justAddedIsShirt, cartData);
    this.displayPromotionMessage(totalShirtCount);
  }

  async getTotalShirtCountInCart(justAddedIsShirt, justAddedItem) {
    try {
      // Fetch current cart to get all items
      const response = await fetch('/cart.js');
      const cart = await response.json();

      console.log('Full cart data from API:', cart);

      let shirtCount = 0;

      if (cart && cart.items) {
        cart.items.forEach(item => {
          const isShirt = this.isShirtProduct(item);
          console.log(`Item: ${item.handle || item.product_title} is shirt: ${isShirt}, quantity: ${item.quantity}`);

          if (isShirt) {
            shirtCount += item.quantity;
          }
        });
      }

      console.log('Total shirts in cart:', shirtCount);
      return shirtCount;

    } catch (error) {
      console.error('Error fetching cart:', error);

      // Fallback: if we can't fetch the cart, but we know a shirt was just added
      if (justAddedIsShirt) {
        const quantity = justAddedItem?.quantity || 1;
        console.log('Fallback: Using just-added shirt quantity:', quantity);
        return quantity;
      }

      return 0;
    }
  }

  isShirtProduct(item) {
    if (!item) return false;

    console.log('Checking if item is shirt:', {
      handle: item.handle,
      product_title: item.product_title,
      product_type: item.product_type,
      title: item.title
    });

    // Check if product type contains 'shirt'
    if (item.product_type && item.product_type.toLowerCase().includes('shirt')) {
      console.log('Detected as shirt via product_type:', item.product_type);
      return true;
    }

    // Check collections if available
    if (item.collections) {
      const isInShirtCollection = item.collections.some(collection =>
        collection.handle === 'shirts' ||
        collection.id === 478689722404 ||
        collection.handle === 'long-sleeve-western-shirts' ||
        collection.handle === 'fishing-shirts'
      );
      if (isInShirtCollection) {
        console.log('Detected as shirt via collections');
        return true;
      }
    }

    // Check product handle for known shirt products
    if (item.handle) {
      const shirtHandles = [
        'duckpopper', 'the-duckpopper',
        'neon-moon', 'the-neon-moon',
        'black-on-black-luxe-pearl-snap',
        'light-blue-performance-crop',
        'light-blue-og-fishing-shirt'
      ];
      const matchedHandle = shirtHandles.some(handle => item.handle.toLowerCase().includes(handle));
      if (matchedHandle) {
        console.log('Detected as shirt via handle:', item.handle);
        return true;
      }
    }

    // Check product title for shirt-related keywords
    const title = item.product_title || item.title || '';
    if (title) {
      const shirtKeywords = ['duckpopper', 'neon moon', 'pearl snap', 'fishing shirt', 'performance crop'];
      const matchedTitle = shirtKeywords.some(keyword => title.toLowerCase().includes(keyword));
      if (matchedTitle) {
        console.log('Detected as shirt via title:', title);
        return true;
      }
    }

    console.log('Not detected as shirt');
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
