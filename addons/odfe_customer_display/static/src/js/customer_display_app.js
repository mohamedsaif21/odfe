/** @odoo-module */

import { Component, useState, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { OrderDisplay } from "./order_display.js";
import { PaymentDisplay } from "./payment_display.js";
import { ThankYouScreen } from "./thank_you_screen.js";

export class CustomerDisplayApp extends Component {
    static template = xml`
        <div class="cd-fullscreen">
            <t t-if="state.state === 'idle'">
                <div class="cd-screen cd-idle">
                    <div class="cd-idle-content">
                        <div class="cd-idle-logo">
                            <i class="fa fa-cutlery fa-5x"/>
                        </div>
                        <h2 class="cd-idle-title">Scan to Order</h2>
                        <div class="cd-idle-qr">
                            <div class="cd-qr-placeholder">
                                <i class="fa fa-qrcode fa-4x"/>
                                <p>Self-order menu</p>
                            </div>
                        </div>
                        <div class="cd-idle-promo">
                            <p class="cd-idle-promo-text">Today's Special</p>
                            <p class="cd-idle-promo-desc">Ask your server for details</p>
                        </div>
                    </div>
                </div>
            </t>
            <t t-elif="state.state === 'order_placed'">
                <OrderDisplay data="state.animationData"/>
            </t>
            <t t-elif="state.state === 'payment'">
                <PaymentDisplay qrData="state.qrData" amountDue="state.amountDue"/>
            </t>
            <t t-elif="state.state === 'thank_you'">
                <ThankYouScreen onComplete="onThankYouComplete"/>
            </t>
        </div>
    `;

    static components = { OrderDisplay, PaymentDisplay, ThankYouScreen };

    setup() {
        this.state = useState({
            displayId: null,
            state: "idle",
            displayText: "",
            qrData: null,
            amountDue: 0,
            animationData: null,
        });

        onMounted(() => {
            const el = document.getElementById("customer-display-app");
            if (el) {
                const did = el.getAttribute("data-display-id");
                if (did) {
                    this.state.displayId = parseInt(did, 10);
                }
            }
            this._startPolling();
        });

        onWillUnmount(() => {
            this._stopPolling();
        });
    }

    _startPolling() {
        this._pollInterval = setInterval(() => this._fetchStatus(), 3000);
        this._fetchStatus();
    }

    _stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    }

    async _fetchStatus() {
        try {
            const result = await this._rpc({
                route: "/api/customer/display/status",
                params: { display_id: this.state.displayId },
            });
            if (result.success) {
                this.state.state = result.state;
                this.state.displayText = result.display_text || "";
                this.state.qrData = result.qr_data || null;
                this.state.amountDue = result.amount_due || 0;
                if (result.animation_data) {
                    try {
                        const parsed = typeof result.animation_data === "string"
                            ? JSON.parse(result.animation_data)
                            : result.animation_data;
                        this.state.animationData = parsed;
                    } catch (e) {
                        this.state.animationData = result.animation_data;
                    }
                }
            }
        } catch (err) {
            console.warn("Customer display poll error:", err);
        }
    }

    onThankYouComplete() {
        this.state.state = "idle";
    }

    async _rpc(params) {
        const response = await fetch(params.route, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }
}

export function startDisplayApp() {
    const app = new CustomerDisplayApp();
    app.mount(document.getElementById("customer-display-app"));
}

export default startDisplayApp;
