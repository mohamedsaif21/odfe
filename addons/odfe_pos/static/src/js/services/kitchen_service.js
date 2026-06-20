export class KitchenService {
    static orders = [];

    static sendToKitchen(order) {
        this.orders.push({
            ...order,
            kitchenStatus: "pending",
            sentAt: new Date().toISOString(),
        });
        console.log("Kitchen: Order sent", order.name);
        return true;
    }

    static getOrders(status = null) {
        if (status) return this.orders.filter((o) => o.kitchenStatus === status);
        return this.orders;
    }

    static updateStatus(orderId, status) {
        const order = this.orders.find((o) => o.id === orderId);
        if (order) {
            order.kitchenStatus = status;
            return true;
        }
        return false;
    }
}
