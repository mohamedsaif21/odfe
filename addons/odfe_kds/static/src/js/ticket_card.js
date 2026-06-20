/** @odoo-module */
import { Component, useState, onWillStart, onWillUnmount } from "@odoo/owl";

export class TicketCard extends Component {
    static template = "odfe_kds.TicketCard";
    static props = {
        order: { type: Object },
        onAccept: { type: Function },
        onStart: { type: Function },
        onComplete: { type: Function },
        onCollect: { type: Function },
    };

    setup() {
        this.elapsed = 0;
        this._timerInterval = null;

        onWillStart(() => {
            this._startTimer();
        });

        onWillUnmount(() => {
            this._stopTimer();
        });
    }

    _startTimer() {
        if (this.props.order.created_at) {
            const created = new Date(this.props.order.created_at);
            this._updateElapsed(created);
        }
        this._timerInterval = setInterval(() => {
            if (this.props.order.created_at) {
                const created = new Date(this.props.order.created_at);
                this._updateElapsed(created);
            }
        }, 1000);
    }

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
        }
    }

    _updateElapsed(created) {
        const now = new Date();
        this.elapsed = Math.floor((now - created) / 1000);
    }

    get formattedTime() {
        const minutes = Math.floor(this.elapsed / 60);
        const seconds = this.elapsed % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    get timerClass() {
        if (this.elapsed > 600) return "odfe-kds-ticket__timer--danger";
        if (this.elapsed > 300) return "odfe-kds-ticket__timer--warning";
        return "odfe-kds-ticket__timer--ok";
    }

    get priorityClass() {
        const priority = this.props.order.priority;
        if (priority === "urgent") return "odfe-kds-ticket__priority--urgent";
        if (priority === "high") return "odfe-kds-ticket__priority--high";
        return "odfe-kds-ticket__priority--normal";
    }

    get nextAction() {
        const state = this.props.order.state;
        if (state === "pending") return { label: "Accept", class: "odfe-kds-ticket__action--accept", handler: () => this.props.onAccept(this.props.order.id) };
        if (state === "preparing") return { label: "Ready", class: "odfe-kds-ticket__action--complete", handler: () => this.props.onComplete(this.props.order.id) };
        if (state === "ready") return { label: "Collect", class: "odfe-kds-ticket__action--collect", handler: () => this.props.onCollect(this.props.order.id) };
        return null;
    }
}
