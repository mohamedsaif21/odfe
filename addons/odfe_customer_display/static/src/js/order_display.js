/** @odoo-module */

import { Component } from "@odoo/owl";

export class OrderDisplay extends Component {
    static template = "odfe_customer_display.OrderDisplay";
    static props = {
        data: {
            type: Object,
            shape: {
                lines: { type: Array, optional: true },
                subtotal: { type: Number, optional: true },
                tax_amount: { type: Number, optional: true },
                total: { type: Number, optional: true },
                order_name: { type: String, optional: true },
            },
        },
    };

    get hasItems() {
        return this.props.data && this.props.data.lines && this.props.data.lines.length > 0;
    }

    get orderName() {
        return this.props.data?.order_name || "";
    }

    get lines() {
        return this.props.data?.lines || [];
    }

    get subtotal() {
        return this.props.data?.subtotal || 0;
    }

    get taxAmount() {
        return this.props.data?.tax_amount || 0;
    }

    get total() {
        return this.props.data?.total || 0;
    }
}
