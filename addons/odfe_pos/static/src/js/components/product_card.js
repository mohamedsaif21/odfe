/** @odoo-module */
import { Component } from "@odoo/owl";

export class ProductCard extends Component {
    static template = "odfe_pos.ProductCard";
    static props = {
        product: { type: Object },
        onSelect: { type: Function },
        onFavorite: { type: Function, optional: true },
    };
}
