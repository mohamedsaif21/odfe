/** @odoo-module */

import { Component, onMounted, onWillUnmount } from "@odoo/owl";

export class TicketCard extends Component {
    static template = "odfe_kds.TicketCard";
    static props = {
        order: { type: Object },
        onAccept: { type: Function },
        onStart: { type: Function },
        onComplete: { type: Function },
    };

    setup() {
        this._timerInterval = null;

        onMounted(() => {
            this._startTimer();
        });

        onWillUnmount(() => {
            if (this._timerInterval) {
                clearInterval(this._timerInterval);
            }
        });
    }

    _startTimer() {
        if (this._timerInterval) return;
        this._updateTimer();
        this._timerInterval = setInterval(() => this._updateTimer(), 1000);
    }

    _updateTimer() {
        const el = this.el.querySelector(".kds-timer-value");
        if (!el) return;
        const created = this.props.order.created_at;
        if (!created) {
            el.textContent = "--:--";
            return;
        }
        const start = new Date(created).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
}
