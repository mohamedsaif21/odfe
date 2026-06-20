import { Component } from "@odoo/owl";

export class ReceiptPreview extends Component {
    static template = "odfe_pos.ReceiptPreview";
    static props = {
        receipt: { type: Object, optional: true },
    };
}
