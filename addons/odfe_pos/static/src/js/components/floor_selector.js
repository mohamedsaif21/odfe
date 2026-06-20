import { Component } from "@odoo/owl";

export class FloorSelector extends Component {
    static template = "odfe_pos.FloorSelector";
    static props = {
        floors: { type: Array },
        activeId: { type: Number },
        onSelect: { type: Function },
    };
}
