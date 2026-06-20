/** @odoo-module */

import { Component, useState, onWillStart, onWillUnmount } from "@odoo/owl";
import { KitchenBoard } from "./kitchen_board.js";
import { Filters } from "./filters.js";
import { Search } from "./search.js";
import { Realtime } from "./realtime.js";

export class KdsApp extends Component {
    static template = "odfe_kds.KDSDashboard";
    static components = { KitchenBoard, Filters, Search };

    setup() {
        this.state = useState({
            orders: [],
            filteredOrders: [],
            activeFilter: "pending",
            searchQuery: "",
            filterOptions: [
                { label: "All", value: "all" },
                { label: "To Cook", value: "pending" },
                { label: "Preparing", value: "preparing" },
                { label: "Completed", value: "completed" },
            ],
        });

        this.realtime = new Realtime();
        this._updateClock();

        onWillStart(() => {
            this.realtime.start((orders) => {
                this.state.orders = orders;
                this._applyFilters();
            });
        });

        onWillUnmount(() => {
            this.realtime.stop();
            if (this._clockInterval) {
                clearInterval(this._clockInterval);
            }
        });

        this._clockInterval = setInterval(() => this._updateClock(), 1000);
    }

    setFilter(value) {
        this.state.activeFilter = value;
        this._applyFilters();
    }

    onSearch(query) {
        this.state.searchQuery = query;
        this._applyFilters();
    }

    clearSearch() {
        this.state.searchQuery = "";
        this._applyFilters();
    }

    _applyFilters() {
        let orders = this.state.orders;

        if (this.state.activeFilter !== "all") {
            orders = orders.filter((o) => o.state === this.state.activeFilter);
        }

        if (this.state.searchQuery) {
            const q = this.state.searchQuery.toLowerCase();
            orders = orders.filter(
                (o) =>
                    o.name.toLowerCase().includes(q) ||
                    o.table_name.toLowerCase().includes(q) ||
                    o.items.some((i) => i.product_name.toLowerCase().includes(q))
            );
        }

        orders.sort((a, b) => {
            if (a.priority === "urgent" && b.priority !== "urgent") return -1;
            if (a.priority !== "urgent" && b.priority === "urgent") return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        this.state.filteredOrders = orders;
    }

    async acceptOrder(orderId) {
        await this.realtime.acceptOrder(orderId);
    }

    async startOrder(orderId) {
        await this.realtime.startOrder(orderId);
    }

    async completeOrder(orderId) {
        await this.realtime.completeOrder(orderId);
    }

    _updateClock() {
        const el = document.getElementById("kds-clock");
        if (el) {
            const now = new Date();
            el.textContent = now.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        }
        const countEl = document.getElementById("kds-order-count");
        if (countEl) {
            const active = this.state.orders.filter(
                (o) => o.state !== "completed" && o.state !== "cancelled"
            ).length;
            countEl.textContent = `${active} active order${active !== 1 ? "s" : ""}`;
        }
    }
}
