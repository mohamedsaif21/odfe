/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";

export class ReceiptScreen extends Component {
    static template = "odfe_pos.ReceiptScreen";
    static props = {
        order: { type: Object },
        receiptId: { type: Number },
        onNewOrder: { type: Function },
    };

    setup() {
        this.state = useState({
            order: this.props.order || {},
            receiptNumber: `RCP-${this.props.receiptId || "N/A"}`,
        });
    }

    printReceipt() {
        window.print();
    }

    async emailReceipt() {
        const email = prompt("Enter email address:");
        if (email) {
            try {
                await fetch("/api/pos/receipt/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        params: { receipt_id: this.props.receiptId, email_to: email },
                    }),
                });
                alert("Receipt emailed successfully!");
            } catch (e) {
                alert("Failed to email receipt.");
            }
        }
    }

    newOrder() {
        this.props.onNewOrder();
    }
}
