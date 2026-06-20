export class ApiService {
    static async request(route, params = {}) {
        try {
            const result = await fetch(route, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ params }),
            });
            return await result.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, message: error.message };
        }
    }

    static async openSession(startCash = 0) {
        return this.request("/api/pos/session/open", { start_cash: startCash });
    }

    static async closeSession(sessionId, cashCount = 0) {
        return this.request("/api/pos/session/close", { session_id: sessionId, cash_count: cashCount });
    }

    static async createOrder(sessionId, data) {
        return this.request("/api/pos/order/create", { session_id: sessionId, ...data });
    }

    static async getOrder(orderId) {
        return this.request("/api/pos/order/get", { order_id: orderId });
    }

    static async searchProducts(query, categoryId, page = 1) {
        return this.request("/api/pos/product/search", { query, category_id: categoryId, page });
    }

    static async searchCustomers(query) {
        return this.request("/api/pos/customer/search", { query });
    }

    static async processPayment(orderId, payments) {
        return this.request("/api/pos/payment/process", { order_id: orderId, payments });
    }

    static async listTables(floorId) {
        return this.request("/api/pos/table/list", { floor_id: floorId });
    }

    static async cartAdd(sessionId, productId, quantity = 1, modifiers = null, tableId = null) {
        return this.request("/api/pos/cart/add", { session_id: sessionId, product_id: productId, quantity, modifiers, table_id: tableId });
    }
}
