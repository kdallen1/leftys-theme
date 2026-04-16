class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

// Shirt promotion logic
class ShirtPromotion {
  constructor() {
    this.shirtCollectionIds = ['478689722404']; // The shirts collection ID from the URL
    this.shirtCollectionHandles = ['shirts', 'long-sleeve-western-shirts', 'fishing-shirts']; // Collection handles for shirts
    this.init();
  }

  init() {
    // Listen for cart updates
    document.addEventListener('shopify:section:load', () => {
      this.updateShirtPromotion();
    });

    // Subscribe to cart update events
    if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
        setTimeout(() => this.updateShirtPromotion(), 100);
      });
    }

    // Initial check when page loads
    document.addEventListener('DOMContentLoaded', () => {
      this.updateShirtPromotion();
    });
  }

  updateShirtPromotion() {
    console.log('Updating cart drawer shirt promotion using DOM data');

    // Count shirts by reading data attributes from cart items
    const shirtCount = this.countShirtsInCart();
    this.displayPromotionMessage(shirtCount);
  }

  countShirtsInCart() {
    let shirtCount = 0;

    // Look for cart items in the cart drawer DOM
    const cartItems = document.querySelectorAll('#CartDrawer .cart-item[data-is-shirt], .cart-item[data-is-shirt]');

    console.log('Found cart drawer items:', cartItems.length);

    cartItems.forEach(item => {
      const isShirt = item.getAttribute('data-is-shirt') === 'true';
      const quantity = parseInt(item.getAttribute('data-quantity')) || 0;

      console.log('Cart drawer item:', item.getAttribute('data-product-handle'), 'is shirt:', isShirt, 'quantity:', quantity);

      if (isShirt) {
        shirtCount += quantity;
      }
    });

    console.log('Total shirt count in cart drawer:', shirtCount);
    return shirtCount;
  }

  displayPromotionMessage(shirtCount) {
    const promotionSection = document.getElementById('shirt-promotion-section');
    const encourageMessage = document.getElementById('shirt-promotion-encourage');
    const congratulateMessage = document.getElementById('shirt-promotion-congratulate');

    if (!promotionSection || !encourageMessage || !congratulateMessage) {
      return;
    }

    // Hide all messages first
    promotionSection.style.display = 'none';
    encourageMessage.style.display = 'none';
    congratulateMessage.style.display = 'none';

    if (shirtCount === 1) {
      // Show encouragement message for 1 shirt
      promotionSection.style.display = 'block';
      encourageMessage.style.display = 'block';
    } else if (shirtCount >= 2) {
      // Show congratulations message for 2+ shirts
      promotionSection.style.display = 'block';
      congratulateMessage.style.display = 'block';
    }
    // For 0 shirts, keep everything hidden
  }
}

// Initialize the shirt promotion when the script loads
const shirtPromotion = new ShirtPromotion();

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
