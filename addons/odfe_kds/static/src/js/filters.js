/** @odoo-module */

import { Component } from "@odoo/owl";

export class Filters extends Component {
    static template = "odfe_kds.Filters";
    static props = {
        filterOptions: { type: Array },
        activeFilter: { type: String },
        setFilter: { type: Function },
    };
}
