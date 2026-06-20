import { Component } from "@odoo/owl";

export class TableCard extends Component {
    static template = "odfe_pos.TableCard";
    static props = {
        table: { type: Object },
        onSelect: { type: Function },
    };
}
