/** @odoo-module */
export class WebSocketService {
    constructor() {
        this.ws = null;
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnect = 5;
    }

    connect(url) {
        try {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
                console.log("WebSocket connected");
                this.reconnectAttempts = 0;
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit(data.type, data.payload);
                } catch (e) {
                    console.warn("WS parse error:", e);
                }
            };
            this.ws.onclose = () => {
                console.log("WebSocket disconnected");
                this._reconnect(url);
            };
            this.ws.onerror = (err) => {
                console.error("WebSocket error:", err);
            };
        } catch (e) {
            console.error("WebSocket connection failed:", e);
        }
    }

    _reconnect(url) {
        if (this.reconnectAttempts >= this.maxReconnect) return;
        this.reconnectAttempts++;
        setTimeout(() => this.connect(url), 2000 * this.reconnectAttempts);
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }

    _emit(event, payload) {
        const cbs = this.listeners[event] || [];
        cbs.forEach((cb) => cb(payload));
    }

    send(type, payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
