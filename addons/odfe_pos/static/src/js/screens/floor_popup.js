import { Component, useState } from "@odoo/owl";

export class FloorPopup extends Component {
    static template = "odfe_pos.FloorPopup";
    static props = {
        floors: { type: Array },
        onSelect: { type: Function },
        onClose: { type: Function },
    };

    setup() {
        this.state = useState({
            floors: this.props.floors || [],
        });
    }

    selectFloor(floor) {
        this.props.onSelect(floor);
        this.props.onClose();
    }

    close() {
        this.props.onClose();
    }
}
