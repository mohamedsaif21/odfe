/** @odoo-module */
import { ApiService } from "./api_service.js";

export class CustomerService {
    static async search(query) {
        const result = await ApiService.searchCustomers(query);
        if (result.success) return result.customers;
        return [];
    }

    static formatLoyaltyPoints(points) {
        return `${points || 0} pts`;
    }

    static getCustomerDisplay(customer) {
        if (!customer) return "Guest";
        return customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown";
    }
}
