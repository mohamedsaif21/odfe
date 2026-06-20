/** @odoo-module */
import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { LoginScreen } from "./screens/login_screen.js";
import { FloorPopup } from "./screens/floor_popup.js";
import { OrderView } from "./screens/order_view.js";
import { Orders } from "./screens/orders.js";
import { OrderDetail } from "./screens/order_detail.js";
import { CustomerScreen } from "./screens/customer_screen.js";
import { PaymentScreen } from "./screens/payment_screen.js";
import { ReceiptScreen } from "./screens/receipt_screen.js";
import { DiscountPopup } from "./screens/discount_popup.js";
import { TableView } from "./screens/table_view.js";
import { SessionClose } from "./screens/session_close.js";
import { ReportsScreen } from "./screens/reports_screen.js";
import { Navbar } from "./components/navbar.js";
import { ProductCard } from "./components/product_card.js";
import { CategoryTabs } from "./components/category_tabs.js";
import { CartComponent } from "./components/cart_component.js";
import { CartItem } from "./components/cart_item.js";
import { OrderSummary } from "./components/order_summary.js";
import { PaymentButton } from "./components/payment_button.js";
import { SearchBar } from "./components/search_bar.js";
import { CustomerCard } from "./components/customer_card.js";
import { TableCard } from "./components/table_card.js";
import { FloorSelector } from "./components/floor_selector.js";
import { ReceiptPreview } from "./components/receipt_preview.js";
import { QrPayment } from "./components/qr_payment.js";
import { ApiService } from "./services/api_service.js";

export class PosApp extends Component {
    static template = "odfe_pos.PosApp";
    static components = {
        LoginScreen,
        FloorPopup,
        OrderView,
        Orders,
        OrderDetail,
        CustomerScreen,
        PaymentScreen,
        ReceiptScreen,
        DiscountPopup,
        TableView,
        SessionClose,
        ReportsScreen,
        Navbar,
        ProductCard,
        CategoryTabs,
        CartComponent,
        CartItem,
        OrderSummary,
        PaymentButton,
        SearchBar,
        CustomerCard,
        TableCard,
        FloorSelector,
        ReceiptPreview,
        QrPayment,
    };

    setup() {
        this.state = useState({
            authenticated: false,
            session: null,
            currentScreen: "menu",
            cart: { lines: [], subtotal: 0, total: 0, discountTotal: 0 },
            selectedTable: null,
            currentFloor: null,
            products: [],
            filteredProducts: [],
            categories: [],
            activeCategory: null,
            searchQuery: "",
            customer: null,
            orderType: "dine-in",
            currentOrder: null,
            orders: [],
            customizationProduct: null,
            showCustomization: false,
        });

        this._keyBindings = this._handleKeyBindings.bind(this);
        onMounted(() => {
            document.addEventListener("keydown", this._keyBindings);
        });
        onWillUnmount(() => {
            document.removeEventListener("keydown", this._keyBindings);
        });
    }

    _handleKeyBindings(e) {
        if (e.key === "F2") {
            e.preventDefault();
            this.state.searchQuery = "";
            const searchInput = document.querySelector(".odfe-pos-search__input");
            if (searchInput) searchInput.focus();
        }
        if (e.key === "Escape") {
            this.state.showCustomization = false;
            this.state.customizationProduct = null;
        }
    }

    onLogin(sessionData) {
        this.state.authenticated = true;
        this.initSession();
    }

    async initSession() {
        const result = await ApiService.openSession(0);
        if (result.success) {
            this.state.session = result;
            this.loadProducts();
            this.loadCategories();
        }
    }

    async loadProducts() {
        const result = await ApiService.searchProducts("", null);
        if (result.success) {
            this.state.products = result.products;
            this._applyFilters();
        }
    }

    async loadCategories() {
        try {
            const result = await ApiService.searchProducts("", null);
            if (result.success) {
                const cats = new Map();
                result.products.forEach((p) => {
                    if (p.category_id && !cats.has(p.category_id)) {
                        cats.set(p.category_id, {
                            id: p.category_id,
                            name: p.category_name,
                            count: result.products.filter((pp) => pp.category_id === p.category_id).length,
                        });
                    }
                });
                this.state.categories = Array.from(cats.values());
            }
        } catch (e) {
            console.warn("Could not load categories");
        }
    }

    _applyFilters() {
        let products = [...this.state.products];

        if (this.state.activeCategory) {
            products = products.filter((p) => p.category_id === this.state.activeCategory);
        }

        if (this.state.searchQuery) {
            const q = this.state.searchQuery.toLowerCase();
            products = products.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.category_name && p.category_name.toLowerCase().includes(q))
            );
        }

        this.state.filteredProducts = products;
    }

    onSearch(query) {
        this.state.searchQuery = query;
        this._applyFilters();
    }

    clearSearch() {
        this.state.searchQuery = "";
        this._applyFilters();
    }

    selectCategory(cat) {
        if (this.state.activeCategory === cat.id) {
            this.state.activeCategory = null;
        } else {
            this.state.activeCategory = cat.id;
        }
        this._applyFilters();
    }

    addProductToCart(product) {
        if (!this.state.session) return;

        // Check if product needs customization
        if (product.has_variants || product.is_customizable) {
            this.state.customizationProduct = product;
            this.state.showCustomization = true;
            return;
        }

        this._addToCart(product, 1, null);
    }

    _addToCart(product, quantity, customization) {
        ApiService.cartAdd(this.state.session.session, product.id, quantity, customization, this.state.selectedTable?.id);

        const customKey = customization ? JSON.stringify(customization) : "";
        const existing = this.state.cart.lines.find(
            (l) => l.product_id === product.id && (JSON.stringify(l.customization) || "") === customKey
        );

        if (existing) {
            existing.quantity += quantity;
        } else {
            this.state.cart.lines.push({
                id: Date.now(),
                product_id: product.id,
                product_name: product.name,
                image_url: product.image_url,
                quantity: quantity,
                price_unit: product.price,
                subtotal: product.price * quantity,
                customization: customization,
                prep_time: product.prep_time,
            });
        }
        this._recalcCart();
    }

    onCustomizeConfirm(options) {
        const product = this.state.customizationProduct;
        if (product) {
            const customText = Object.values(options)
                .filter((v) => v)
                .join(", ");
            this._addToCart(product, 1, customText || null);
        }
        this.state.showCustomization = false;
        this.state.customizationProduct = null;
    }

    onCustomizeCancel() {
        this.state.showCustomization = false;
        this.state.customizationProduct = null;
    }

    updateCartLine(lineId, quantity) {
        const line = this.state.cart.lines.find((l) => l.id === lineId);
        if (!line) return;
        if (quantity <= 0) {
            this.state.cart.lines = this.state.cart.lines.filter((l) => l.id !== lineId);
        } else {
            line.quantity = quantity;
            line.subtotal = line.price_unit * quantity;
        }
        this._recalcCart();
    }

    removeCartLine(lineId) {
        this.state.cart.lines = this.state.cart.lines.filter((l) => l.id !== lineId);
        this._recalcCart();
    }

    clearCart() {
        this.state.cart.lines = [];
        this._recalcCart();
    }

    _recalcCart() {
        const lines = this.state.cart.lines;
        this.state.cart.subtotal = lines.reduce((s, l) => s + l.price_unit * l.quantity, 0);
        this.state.cart.total = this.state.cart.subtotal - this.state.cart.discountTotal;
    }

    async placeOrder() {
        if (this.state.cart.lines.length === 0) return;
        const result = await ApiService.createOrder(this.state.session.session, {
            table_id: this.state.selectedTable?.id,
            customer_id: this.state.customer?.id,
            order_type: this.state.orderType,
            lines: this.state.cart.lines.map((l) => ({
                product_id: l.product_id,
                quantity: l.quantity,
                price_unit: l.price_unit,
                customization: l.customization,
            })),
        });
        if (result.success) {
            this.state.currentScreen = "payment";
            this.state.currentOrder = result;
            this.clearCart();
        }
    }

    onTableSelect(table) {
        this.state.selectedTable = table;
    }

    onFloorSelect(floor) {
        this.state.currentFloor = floor;
    }

    setScreen(screen) {
        this.state.currentScreen = screen;
    }

    toggleOrderType() {
        this.state.orderType = this.state.orderType === "dine-in" ? "takeaway" : "dine-in";
    }

    setCustomer(customer) {
        this.state.customer = customer;
    }
}
