/** @odoo-module */

export class Realtime {
    constructor() {
        this._interval = null;
        this._callback = null;
        this._pollIntervalMs = 5000;
    }

    start(callback) {
        this._callback = callback;
        this._poll();
        this._interval = setInterval(() => this._poll(), this._pollIntervalMs);
    }

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._callback = null;
    }

    async _poll() {
        try {
            const data = await this._rpc("/api/kds/orders", {});
            if (data && data.success && this._callback) {
                this._callback(data.orders || []);
            }
        } catch (e) {
            console.warn("KDS poll error:", e);
        }
    }

    async acceptOrder(orderId) {
        return this._rpc(`/api/kds/order/${orderId}/accept`, {});
    }

    async startOrder(orderId) {
        return this._rpc(`/api/kds/order/${orderId}/start`, {});
    }

    async completeOrder(orderId) {
        return this._rpc(`/api/kds/order/${orderId}/complete`, {});
    }

    async _rpc(route, params) {
        const response = await fetch(route, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }
}
