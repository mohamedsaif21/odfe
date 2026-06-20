/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";
import { debounce } from "../utils.js";

export class CustomerScreen extends Component {
    static template = "odfe_pos.CustomerScreen";
    static props = {
        onSelect: { type: Function },
    };

    setup() {
        this.state = useState({
            customers: [],
            searchQuery: "",
        });
        this._debouncedSearch = debounce((q) => this._search(q), 300);
    }

    searchCustomers(ev) {
        this.state.searchQuery = ev.target.value;
        this._debouncedSearch(this.state.searchQuery);
    }

    async _search(query) {
        if (!query || query.length < 2) {
            this.state.customers = [];
            return;
        }
        const result = await ApiService.searchCustomers(query);
        if (result.success) {
            this.state.customers = result.customers;
        }
    }

    selectCustomer(customer) {
        this.props.onSelect(customer);
    }
}
