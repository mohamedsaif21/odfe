import { Component } from "@odoo/owl";

export class CustomerCard extends Component {
    static template = "odfe_pos.CustomerCard";
    static props = {
        customer: { type: Object },
        onSelect: { type: Function },
    };
}
