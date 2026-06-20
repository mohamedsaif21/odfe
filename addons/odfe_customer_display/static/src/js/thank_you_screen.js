/** @odoo-module */

import { Component, onMounted, onWillUnmount } from "@odoo/owl";

export class ThankYouScreen extends Component {
    static template = "odfe_customer_display.ThankYouScreen";
    static props = {
        onComplete: { type: Function, optional: true },
        autoReturnMs: { type: Number, optional: true },
    };

    setup() {
        this._timeout = null;
        onMounted(() => {
            const delay = this.props.autoReturnMs || 8000;
            this._timeout = setTimeout(() => {
                if (this.props.onComplete) {
                    this.props.onComplete();
                }
            }, delay);
        });
        onWillUnmount(() => {
            if (this._timeout) {
                clearTimeout(this._timeout);
                this._timeout = null;
            }
        });
    }
}
