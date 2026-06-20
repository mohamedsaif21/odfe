/** @odoo-module */
import { Component } from "@odoo/owl";

export class CartItem extends Component {
    static template = "odfe_pos.CartItem";
    static props = {
        line: { type: Object },
        onUpdate: { type: Function },
        onRemove: { type: Function },
    };
}
