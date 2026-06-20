/** @odoo-module */

import { Component, useState } from "@odoo/owl";

export class Search extends Component {
    static template = "odfe_kds.Search";
    static props = {
        onSearch: { type: Function },
        clearSearch: { type: Function },
    };

    setup() {
        this.state = useState({ searchQuery: "" });
    }
}
