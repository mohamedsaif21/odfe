/** @odoo-module */
import { Component } from "@odoo/owl";

export class Navbar extends Component {
    static template = "odfe_pos.Navbar";
    static props = {
        currentFloor: { type: Object, optional: true },
        pendingOrders: { type: Number, optional: true },
        onMenu: { type: Function },
        onFloor: { type: Function },
        onOrders: { type: Function },
        onSession: { type: Function },
    };
}
