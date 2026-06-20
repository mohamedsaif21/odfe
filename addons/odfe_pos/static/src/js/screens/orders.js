/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";

export class Orders extends Component {
    static template = "odfe_pos.Orders";
    static props = {
        onSelect: { type: Function },
    };

    setup() {
        this.state = useState({
            orders: [],
            filteredOrders: [],
            searchQuery: "",
            activeFilter: "all",
        });
    }

    async mounted() {
        await this.loadOrders();
    }

    async loadOrders() {
        try {
            const result = await ApiService.getOrder(0);
            if (result && result.success) {
                this.state.orders = [result.order];
            }
        } catch (e) {
            console.warn("Could not load orders");
        }
        this.filterOrders(this.state.activeFilter);
    }

    filterOrders(filter) {
        this.state.activeFilter = filter;
        if (filter === "all") {
            this.state.filteredOrders = [...this.state.orders];
        } else {
            this.state.filteredOrders = this.state.orders.filter((o) => o.state === filter);
        }
        if (this.state.searchQuery) {
            this.state.filteredOrders = this.state.filteredOrders.filter((o) =>
                o.name.toLowerCase().includes(this.state.searchQuery.toLowerCase())
            );
        }
    }

    openOrder(order) {
        this.props.onSelect(order);
    }
}
