/** @odoo-module */
import { Component, useState } from "@odoo/owl";

export class QrPayment extends Component {
    static template = "odfe_pos.QrPayment";
    static props = {
        amount: { type: Number },
        orderId: { type: Number },
        onComplete: { type: Function },
    };

    setup() {
        this.state = useState({
            qrData: null,
            status: "",
        });
    }

    async mounted() {
        this.state.qrData = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">QR: ${this.props.amount}</text></svg>`;
        this.state.status = "Awaiting payment...";
        this._poll = setInterval(() => this._checkPayment(), 2000);
    }

    willUnmount() {
        if (this._poll) clearInterval(this._poll);
    }

    async _checkPayment() {
        this.state.status = "Waiting for scan...";
    }
}
