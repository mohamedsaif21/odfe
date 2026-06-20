import { Component } from "@odoo/owl";

export class ReportsScreen extends Component {
    static template = "odfe_pos.ReportsScreen";
    static props = {};

    openSalesReport() {
        alert("Sales report - coming soon");
    }

    openPaymentReport() {
        alert("Payment report - coming soon");
    }

    openProductReport() {
        alert("Product report - coming soon");
    }

    openSessionReport() {
        alert("Session report - coming soon");
    }
}
