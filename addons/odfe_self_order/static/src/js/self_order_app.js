odoo.define('odfe_self_order.SelfOrderApp', function (require) {
    'use strict';

    const { Component, mount, useState, useRef, onMounted, xml } = owl;

    const MENU_URL = '/api/self/menu';
    const SUBMIT_URL = '/api/self/order/submit';
    const VALIDATE_URL = '/api/self/validate-token';
    const CURRENCY = '\u20B9';

    function formatPrice(amount) {
        return CURRENCY + parseFloat(amount || 0).toFixed(0);
    }

    const PRODUCT_EMOJIS = {
        'coffee': '\u2615', 'espresso': '\u2615', 'cappuccino': '\u2615', 'latte': '\u2615',
        'mocha': '\u2615', 'americano': '\u2615', 'macchiato': '\u2615', 'cold coffee': '\u2615',
        'tea': '\uD83C\uDF75', 'chai': '\uD83C\uDF75', 'green tea': '\uD83C\uDF75', 'masala chai': '\uD83C\uDF75',
        'juice': '\uD83E\uDDC3', 'mango': '\uD83E\uDD6D', 'smoothie': '\uD83E\uDDC3',
        'pastry': '\uD83E\uDD50', 'cake': '\uD83C\uDF70', 'croissant': '\uD83E\uDD50',
        'sandwich': '\uD83C\uDD6F', 'burger': '\uD83C\uDF54', 'pizza': '\uD83C\uDF55',
        'samosa': '\uD83C\uDF5F', 'vada pav': '\uD83C\uDF5F', 'dosa': '\uD83C\uDF5F',
        'default': '\uD83C\uDF54',
    };

    function getEmoji(name) {
        const lower = (name || '').toLowerCase();
        for (const [key, emoji] of Object.entries(PRODUCT_EMOJIS)) {
            if (lower.includes(key)) return emoji;
        }
        return PRODUCT_EMOJIS['default'];
    }

    class SelfOrderApp extends Component {
        static template = xml`
            <div class="self-order-app">
                <t t-if="state.loading">
                    <div class="loading-screen">
                        <div class="loading-spinner"/>
                        <p class="loading-text">Loading menu...</p>
                    </div>
                </t>
                <t t-elif="state.error">
                    <div class="error-screen">
                        <div class="error-icon">!</div>
                        <h2><t t-esc="state.error"/></h2>
                        <button class="btn-primary" t-on-click="initApp">Retry</button>
                    </div>
                </t>
                <t t-else="">
                    <header class="app-header">
                        <div class="header-top">
                            <div class="header-info">
                                <span class="table-badge">
                                    <i class="fa fa-cutlery" style="margin-right: 6px;"/>
                                    Table <t t-esc="state.tableName"/>
                                </span>
                            </div>
                            <button class="cart-button" t-on-click="toggleCart" t-att-class="{'has-items': state.cart.length > 0}">
                                <span class="cart-icon">&#x1F6D2;</span>
                                <span class="cart-count" t-if="state.cart.length > 0"><t t-esc="state.cart.length"/></span>
                            </button>
                        </div>
                        <div class="header-search">
                            <div class="search-wrapper">
                                <i class="fa fa-search search-icon"/>
                                <input type="text" class="search-input" placeholder="Search menu..." t-model="state.searchQuery"/>
                            </div>
                        </div>
                        <div class="category-tabs" t-if="state.categories.length > 0">
                            <button class="category-tab" t-att-class="{'active': state.activeCategory === null}" t-on-click="selectCategory(null)">
                                All
                            </button>
                            <button class="category-tab" t-att-class="{'active': state.activeCategory === cat.id}" t-foreach="state.categories" t-as="cat" t-key="cat.id" t-on-click="selectCategory(cat.id)">
                                <t t-esc="cat.name"/>
                            </button>
                        </div>
                    </header>

                    <main class="menu-content" t-ref="menuContent">
                        <t t-if="state.activeCategory !== null">
                            <t t-set="currentCat" t-value="state.categories.find(c => c.id === state.activeCategory)"/>
                            <div class="category-section" t-if="currentCat">
                                <div class="product-grid">
                                    <div class="product-card" t-foreach="currentCat.products" t-as="product" t-key="product.id"
                                         t-if="!state.searchQuery || product.name.toLowerCase().includes(state.searchQuery.toLowerCase())">
                                        <div class="product-image" t-if="product.image">
                                            <img t-att-src="product.image" t-att-alt="product.name"/>
                                        </div>
                                        <div class="product-image product-image--emoji" t-else="">
                                            <span style="font-size: 48px;" t-esc="getEmoji(product.name)"/>
                                        </div>
                                        <div class="product-info">
                                            <h3 class="product-name"><t t-esc="product.name"/></h3>
                                            <p class="product-desc" t-if="product.description"><t t-esc="product.description"/></p>
                                            <div class="product-bottom">
                                                <span class="product-price"><t t-esc="formatPrice(product.price)"/></span>
                                                <button class="btn-add" t-on-click="() => addToCart(product)">+ Add</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </t>
                        <t t-else="">
                            <div class="category-section" t-foreach="state.categories" t-as="cat" t-key="cat.id">
                                <t t-if="cat.products.filter(p => !state.searchQuery || p.name.toLowerCase().includes(state.searchQuery.toLowerCase())).length > 0">
                                    <h2 class="category-title"><t t-esc="cat.name"/></h2>
                                    <div class="product-grid">
                                        <div class="product-card" t-foreach="cat.products" t-as="product" t-key="product.id"
                                             t-if="!state.searchQuery || product.name.toLowerCase().includes(state.searchQuery.toLowerCase())">
                                            <div class="product-image" t-if="product.image">
                                                <img t-att-src="product.image" t-att-alt="product.name"/>
                                            </div>
                                            <div class="product-image product-image--emoji" t-else="">
                                                <span style="font-size: 48px;" t-esc="getEmoji(product.name)"/>
                                            </div>
                                            <div class="product-info">
                                                <h3 class="product-name"><t t-esc="product.name"/></h3>
                                                <p class="product-desc" t-if="product.description"><t t-esc="product.description"/></p>
                                                <div class="product-bottom">
                                                    <span class="product-price"><t t-esc="formatPrice(product.price)"/></span>
                                                    <button class="btn-add" t-on-click="() => addToCart(product)">+ Add</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </t>
                            </div>
                        </t>
                    </main>

                    <t t-if="state.cart.length > 0">
                        <div class="cart-overlay" t-att-class="{'open': state.cartOpen}" t-on-click="toggleCart"/>
                        <aside class="cart-panel" t-att-class="{'open': state.cartOpen}">
                            <div class="cart-header">
                                <h2>Your Order</h2>
                                <button class="cart-close" t-on-click="toggleCart">&#10005;</button>
                            </div>
                            <div class="cart-items">
                                <div class="cart-item" t-foreach="state.cart" t-as="item" t-key="item.id">
                                    <div class="cart-item-left">
                                        <span class="cart-item-emoji" t-esc="getEmoji(item.name)"/>
                                        <div class="cart-item-info">
                                            <span class="cart-item-name"><t t-esc="item.name"/></span>
                                            <div class="cart-item-controls">
                                                <button class="qty-btn" t-on-click="() => updateQty(item, -1)">&#8722;</button>
                                                <span class="qty-value"><t t-esc="item.quantity"/></span>
                                                <button class="qty-btn" t-on-click="() => updateQty(item, 1)">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="cart-item-right">
                                        <span class="cart-item-price"><t t-esc="formatPrice(item.price * item.quantity)"/></span>
                                        <button class="cart-item-remove" t-on-click="() => removeItem(item)">&#10005;</button>
                                    </div>
                                </div>
                            </div>
                            <div class="cart-footer">
                                <div class="cart-totals">
                                    <div class="cart-total-row">
                                        <span>Subtotal</span>
                                        <span><t t-esc="formatPrice(cartSubtotal)"/></span>
                                    </div>
                                    <div class="cart-total-row total">
                                        <span>Total</span>
                                        <span><t t-esc="formatPrice(cartSubtotal)"/></span>
                                    </div>
                                </div>
                                <div class="cart-note">
                                    <input type="text" class="note-input" placeholder="Add a note (optional)" t-model="state.orderNote"/>
                                </div>
                                <button class="btn-checkout" t-on-click="showCheckout">
                                    Proceed to Checkout
                                </button>
                            </div>
                        </aside>
                    </t>

                    <t t-if="state.showCheckout">
                        <div class="checkout-overlay" t-on-click="closeCheckout"/>
                        <div class="checkout-modal">
                            <div class="checkout-header">
                                <h2>Confirm Order</h2>
                                <button class="checkout-close" t-on-click="closeCheckout">&#10005;</button>
                            </div>
                            <div class="checkout-items">
                                <div class="checkout-item" t-foreach="state.cart" t-as="item" t-key="item.id">
                                    <span class="checkout-item-name"><t t-esc="item.quantity"/>x <t t-esc="item.name"/></span>
                                    <span class="checkout-item-price"><t t-esc="formatPrice(item.price * item.quantity)"/></span>
                                </div>
                            </div>
                            <div class="checkout-totals">
                                <div class="checkout-total-row">
                                    <span>Subtotal</span>
                                    <span><t t-esc="formatPrice(cartSubtotal)"/></span>
                                </div>
                                <div class="checkout-total-row total">
                                    <span>Total</span>
                                    <span><t t-esc="formatPrice(cartSubtotal)"/></span>
                                </div>
                            </div>
                            <div class="checkout-contact">
                                <input type="text" class="contact-input" placeholder="Your name (optional)" t-model="state.customerName"/>
                                <input type="tel" class="contact-input" placeholder="Phone number for updates" t-model="state.customerPhone"/>
                            </div>
                            <button class="btn-place-order" t-on-click="placeOrder" t-att-disabled="state.submitting">
                                <t t-if="state.submitting">
                                    Placing Order...
                                </t>
                                <t t-else="">
                                    Place Order &#8212; <t t-esc="formatPrice(cartSubtotal)"/>
                                </t>
                            </button>
                        </div>
                    </t>

                    <t t-if="state.orderSuccess">
                        <div class="success-screen">
                            <div class="success-icon">&#10003;</div>
                            <h2>Order Placed!</h2>
                            <p class="success-ref">Order #<t t-esc="state.orderRef"/></p>
                            <p class="success-msg">Your order has been sent to the kitchen.</p>
                            <button class="btn-primary" t-on-click="goBackToMenu">Back to Menu</button>
                        </div>
                    </t>
                </t>
            </div>
        `;

        setup() {
            this.state = useState({
                loading: true,
                error: null,
                menuData: null,
                categories: [],
                cart: [],
                cartOpen: false,
                showCheckout: false,
                activeCategory: null,
                searchQuery: '',
                tableName: '',
                tableId: null,
                orderNote: '',
                customerName: '',
                customerPhone: '',
                submitting: false,
                orderSuccess: false,
                orderRef: '',
                sessionToken: '',
            });
            this.menuContent = useRef('menuContent');
            onMounted(() => this.initApp());
        }

        getEmoji(name) {
            return getEmoji(name);
        }

        formatPrice(amount) {
            return formatPrice(amount);
        }

        async initApp() {
            this.state.loading = true;
            this.state.error = null;
            const appEl = document.getElementById('self_order_app');
            const qrToken = appEl ? appEl.dataset.qrToken : '';
            this.state.tableName = appEl ? appEl.dataset.tableName : '';
            this.state.tableId = appEl ? parseInt(appEl.dataset.tableId) : null;

            if (!qrToken) {
                this.state.error = 'Invalid QR code';
                this.state.loading = false;
                return;
            }

            try {
                const resp = await this._fetch(MENU_URL, { token: qrToken });
                if (resp.error) {
                    this.state.error = resp.error;
                    this.state.loading = false;
                    return;
                }
                this.state.menuData = resp;
                this.state.categories = resp.categories || [];
                if (resp.table_name) this.state.tableName = resp.table_name;

                const valResp = await this._post(VALIDATE_URL, {
                    token: qrToken,
                    session_id: this._getSessionId(),
                });
                if (valResp.session_token) {
                    this.state.sessionToken = valResp.session_token;
                }
                this.state.loading = false;
            } catch (e) {
                this.state.error = 'Failed to load menu. Please try again.';
                this.state.loading = false;
            }
        }

        selectCategory(catId) {
            this.state.activeCategory = catId;
            if (this.menuContent.el) {
                this.menuContent.el.scrollTop = 0;
            }
        }

        addToCart(product) {
            const existing = this.state.cart.find(i => i.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                this.state.cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image: product.image,
                });
            }
            this.state.cartOpen = false;
        }

        updateQty(item, delta) {
            item.quantity = Math.max(1, item.quantity + delta);
            if (item.quantity <= 0) {
                this.removeItem(item);
            }
        }

        removeItem(item) {
            const idx = this.state.cart.indexOf(item);
            if (idx >= 0) {
                this.state.cart.splice(idx, 1);
            }
        }

        toggleCart() {
            this.state.cartOpen = !this.state.cartOpen;
            this.state.showCheckout = false;
        }

        showCheckout() {
            this.state.cartOpen = false;
            this.state.showCheckout = true;
        }

        closeCheckout() {
            this.state.showCheckout = false;
        }

        async placeOrder() {
            if (this.state.submitting) return;
            this.state.submitting = true;

            const items = this.state.cart.map(i => ({
                product_id: i.id,
                quantity: i.quantity,
                price: i.price,
            }));

            const payload = {
                token: this.state.sessionToken || document.getElementById('self_order_app')?.dataset.qrToken || '',
                items: items,
                note: this.state.orderNote || '',
                customer: {
                    name: this.state.customerName || '',
                    phone: this.state.customerPhone || '',
                },
            };

            try {
                const resp = await this._post(SUBMIT_URL, payload);
                if (resp.error) {
                    alert(resp.error);
                    this.state.submitting = false;
                    return;
                }
                this.state.orderRef = resp.order_ref || resp.order_id;
                this.state.cart = [];
                this.state.showCheckout = false;
                this.state.orderSuccess = true;
                this.state.submitting = false;
            } catch (e) {
                alert('Failed to place order. Please try again.');
                this.state.submitting = false;
            }
        }

        goBackToMenu() {
            this.state.orderSuccess = false;
            this.state.orderNote = '';
            this.state.customerName = '';
            this.state.customerPhone = '';
        }

        get cartSubtotal() {
            return this.state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        }

        _getSessionId() {
            let sid = sessionStorage.getItem('self_order_sid');
            if (!sid) {
                sid = 'sid_' + Math.random().toString(36).substr(2, 16);
                sessionStorage.setItem('self_order_sid', sid);
            }
            return sid;
        }

        async _fetch(url, params) {
            const qs = '?' + Object.entries(params).map(([k, v]) =>
                encodeURIComponent(k) + '=' + encodeURIComponent(v)
            ).join('&');
            const resp = await fetch(url + qs, {
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
            });
            return resp.json();
        }

        async _post(url, data) {
            const resp = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return resp.json();
        }
    }

    const appRoot = document.getElementById('self_order_app');
    if (appRoot) {
        mount(SelfOrderApp, { target: appRoot });
    }

    return SelfOrderApp;
});
