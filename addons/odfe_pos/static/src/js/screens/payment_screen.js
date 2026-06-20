/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";

export class PaymentScreen extends Component {
    static template = "odfe_pos.PaymentScreen";
    static props = {
        orderId: { type: Number },
        total: { type: Number },
        onComplete: { type: Function },
        onBack: { type: Function },
    };

    setup() {
        this.state = useState({
            paymentMethods: [
                { id: 1, name: "Cash", icon: "fa-money" },
                { id: 2, name: "Card", icon: "fa-credit-card" },
                { id: 3, name: "QR", icon: "fa-qrcode" },
                { id: 4, name: "Mobile", icon: "fa-mobile" },
            ],
            selectedMethod: null,
            amount: 0,
            amountPaid: 0,
        });
    }

    selectMethod(method) {
        this.state.selectedMethod = method;
        this.state.amount = Math.max(0, this.props.total - this.state.amountPaid);
    }

    async processPayment() {
        if (this.state.amount <= 0) return;
        const payments = [
            { method_id: this.state.selectedMethod.id, amount: this.state.amount },
        ];
        const result = await ApiService.processPayment(this.props.orderId, payments);
        if (result.success) {
            this.state.amountPaid += this.state.amount;
            this.state.amount = 0;
        }
    }

    async completePayment() {
        const remaining = this.props.total - this.state.amountPaid;
        if (remaining > 0) {
            if (this.state.selectedMethod) {
                await this.processPayment();
            }
            if (this.state.amountPaid < this.props.total) return;
        }
        this.props.onComplete();
    }
}
