import { Component, useState } from "@odoo/owl";

export class CategoryTabs extends Component {
    static template = "odfe_pos.CategoryTabs";
    static props = {
        categories: { type: Array },
        activeId: { type: Number },
        onSelect: { type: Function },
    };

    setup() {
        this.state = useState({
            categories: this.props.categories || [],
            activeCategoryId: this.props.activeId || null,
        });
    }

    selectCategory(cat) {
        this.state.activeCategoryId = cat.id;
        this.props.onSelect(cat);
    }
}
