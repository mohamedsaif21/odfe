import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";

export class SessionClose extends Component {
    static template = "odfe_pos.SessionClose";
    static props = {
        session: { type: Object },
        onClose: { type: Function },
        onCancel: { type: Function },
    };

    setup() {
        this.state = useState({
            cashCount: 0,
        });
    }

    get difference() {
        return this.state.cashCount - (this.props.session.total_sales || 0);
    }

    async closeSession() {
        const result = await ApiService.closeSession(this.props.session.id, this.state.cashCount);
        if (result.success) {
            this.props.onClose();
        } else {
            alert(result.message || "Failed to close session");
        }
    }
}
