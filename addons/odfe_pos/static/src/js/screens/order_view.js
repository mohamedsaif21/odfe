/** @odoo-module */
import { Component } from "@odoo/owl";

export class OrderView extends Component {
    static template = "odfe_pos.OrderView";
    static props = {
        order: { type: Object },
        onPay: { type: Function },
        onCancel: { type: Function },
        onBack: { type: Function },
    };
}
