/** @odoo-module */
import { Component, useState } from "@odoo/owl";

export class CartComponent extends Component {
    static template = "odfe_pos.CartComponent";
    static props = {
        lines: { type: Array },
        subtotal: { type: Number },
        total: { type: Number },
        discountTotal: { type: Number },
        onUpdateLine: { type: Function },
        onRemoveLine: { type: Function },
        onClear: { type: Function },
        onPlaceOrder: { type: Function },
    };

    setup() {
        this.state = useState({
            lines: this.props.lines || [],
            subtotal: this.props.subtotal || 0,
            total: this.props.total || 0,
            discountTotal: this.props.discountTotal || 0,
        });
    }

    updateLine(lineId, quantity) {
        this.props.onUpdateLine(lineId, quantity);
    }

    removeLine(lineId) {
        this.props.onRemoveLine(lineId);
    }

    clearCart() {
        this.props.onClear();
    }

    placeOrder() {
        this.props.onPlaceOrder();
    }
}
