import { Component } from "@odoo/owl";

export class OrderDetail extends Component {
    static template = "odfe_pos.OrderDetail";
    static props = {
        order: { type: Object },
        onBack: { type: Function },
        onPrint: { type: Function },
        onRefund: { type: Function },
    };
}
