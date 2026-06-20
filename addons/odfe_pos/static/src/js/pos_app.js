/** @odoo-module */
import { Component, useState } from "@odoo/owl";
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
            categories: [],
            activeCategory: null,
            searchQuery: "",
        });
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
        }
    }

    async loadCategories() {
        try {
            const result = await ApiService.searchProducts("", null);
            if (result.success) {
                const cats = new Map();
                result.products.forEach((p) => {
                    if (p.category_id && !cats.has(p.category_id)) {
                        cats.set(p.category_id, { id: p.category_id, name: p.category_name });
                    }
                });
                this.state.categories = Array.from(cats.values());
            }
        } catch (e) {
            console.warn("Could not load categories");
        }
    }

    addProductToCart(product) {
        if (!this.state.session) return;
        ApiService.cartAdd(this.state.session.session, product.id, 1, null, this.state.selectedTable?.id);
        const existing = this.state.cart.lines.find((l) => l.product_id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.state.cart.lines.push({
                id: Date.now(),
                product_id: product.id,
                product_name: product.name,
                quantity: 1,
                price_unit: product.price,
                subtotal: product.price,
            });
        }
        this._recalcCart();
    }

    updateCartLine(lineId, quantity) {
        const line = this.state.cart.lines.find((l) => l.id === lineId);
        if (!line) return;
        if (quantity <= 0) {
            this.state.cart.lines = this.state.cart.lines.filter((l) => l.id !== lineId);
        } else {
            line.quantity = quantity;
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
        this.state.cart.total = this.state.cart.subtotal;
    }

    async placeOrder() {
        if (this.state.cart.lines.length === 0) return;
        const result = await ApiService.createOrder(this.state.session.session, {
            table_id: this.state.selectedTable?.id,
            lines: this.state.cart.lines.map((l) => ({
                product_id: l.product_id,
                quantity: l.quantity,
                price_unit: l.price_unit,
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
}
