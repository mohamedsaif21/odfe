/** @odoo-module */

import { Component } from "@odoo/owl";

export class PaymentDisplay extends Component {
    static template = "odfe_customer_display.PaymentDisplay";
    static props = {
        qrData: { type: String, optional: true },
        amountDue: { type: Number, optional: true },
    };

    get formattedAmount() {
        if (this.props.amountDue == null) return "0.00";
        return this.props.amountDue.toFixed(2);
    }

    get hasQr() {
        return this.props.qrData && this.props.qrData.length > 0;
    }
}
