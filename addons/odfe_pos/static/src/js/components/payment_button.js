/** @odoo-module */
import { Component } from "@odoo/owl";

export class PaymentButton extends Component {
    static template = "odfe_pos.PaymentButton";
    static props = {
        method: { type: Object },
        onSelect: { type: Function },
    };
}
