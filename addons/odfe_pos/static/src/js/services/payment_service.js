import { ApiService } from "./api_service.js";

export class PaymentService {
    static methods = [
        { id: 1, name: "Cash", icon: "fa-money" },
        { id: 2, name: "Card", icon: "fa-credit-card" },
        { id: 3, name: "QR Code", icon: "fa-qrcode" },
        { id: 4, name: "Mobile Wallet", icon: "fa-mobile" },
    ];

    static async processOrderPayment(orderId, payments) {
        return ApiService.processPayment(orderId, payments);
    }

    static calculateChange(total, paid) {
        return Math.max(0, paid - total);
    }

    static splitAmount(total, parts) {
        return parts.map((p) => ({
            ...p,
            amount: p.percent ? total * (p.percent / 100) : p.amount,
        }));
    }

    static validatePayment(total, payments) {
        const sum = payments.reduce((acc, p) => acc + p.amount, 0);
        return sum >= total;
    }
}
