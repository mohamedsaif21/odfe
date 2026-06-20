import { Component, useState } from "@odoo/owl";
import { ApiService } from "../services/api_service.js";

export class TableView extends Component {
    static template = "odfe_pos.TableView";
    static props = {
        floorId: { type: Number },
        onSelect: { type: Function },
    };

    setup() {
        this.state = useState({
            tables: [],
            selectedTableId: null,
        });
    }

    async mounted() {
        await this.loadTables();
    }

    async loadTables() {
        const result = await ApiService.listTables(this.props.floorId);
        if (result.success) {
            this.state.tables = result.tables;
        }
    }

    selectTable(table) {
        this.state.selectedTableId = table.id;
        this.props.onSelect(table);
    }
}
