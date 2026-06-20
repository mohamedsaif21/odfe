/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { debounce } from "../utils.js";

export class SearchBar extends Component {
    static template = "odfe_pos.SearchBar";
    static props = {
        onSearch: { type: Function },
        placeholder: { type: String, optional: true },
    };

    setup() {
        this.state = useState({ query: "" });
        this._debouncedSearch = debounce((q) => this.props.onSearch(q), 300);
    }

    onSearch(ev) {
        this.state.query = ev.target.value;
        this._debouncedSearch(this.state.query);
    }

    clearSearch() {
        this.state.query = "";
        this.props.onSearch("");
    }
}
