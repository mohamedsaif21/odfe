/** @odoo-module */
import { Component, useState } from "@odoo/owl";

export class DiscountPopup extends Component {
    static template = "odfe_pos.DiscountPopup";
    static props = {
        onApply: { type: Function },
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            discountType: "percentage",
            discountValue: 0,
        });
    }

    applyDiscount() {
        if (this.state.discountValue <= 0) return;
        this.props.onApply({
            type: this.state.discountType,
            value: parseFloat(this.state.discountValue),
        });
        this.props.onClose();
    }

    close() {
        this.props.onClose();
    }
}
