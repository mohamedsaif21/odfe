import { Component } from "@odoo/owl";

export class OrderSummary extends Component {
    static template = "odfe_pos.OrderSummary";
    static props = {
        order: { type: Object },
    };
}
