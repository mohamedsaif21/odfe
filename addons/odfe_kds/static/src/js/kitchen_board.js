/** @odoo-module */

import { Component } from "@odoo/owl";
import { TicketCard } from "./ticket_card.js";

export class KitchenBoard extends Component {
    static template = "odfe_kds.KitchenBoard";
    static components = { TicketCard };
    static props = {
        filteredOrders: { type: Array },
        acceptOrder: { type: Function },
        startOrder: { type: Function },
        completeOrder: { type: Function },
    };
}
