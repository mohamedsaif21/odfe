(function () {
    "use strict";

    class KpiCard {
        constructor(el, options) {
            this.el = el;
            this.label = options.label || "";
            this.value = options.value || 0;
            this.trend = options.trend || null;
            this.format = options.format || "number";
            this.prefix = options.prefix || "";
            this.suffix = options.suffix || "";
            this.render();
        }

        formatValue(val) {
            const num = parseFloat(val) || 0;
            if (this.format === "currency") {
                return new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(num);
            }
            if (this.format === "percentage") {
                return num.toFixed(1) + "%";
            }
            return new Intl.NumberFormat("en-US").format(num);
        }

        render() {
            if (!this.el) return;
            this.el.innerHTML = `
                <div class="card o_kpi_card_inner">
                    <div class="card-body">
                        <div class="o_kpi_label text-muted small">${this.label}</div>
                        <div class="o_kpi_value h4 mb-1">${this.prefix}${this.formatValue(this.value)}${this.suffix}</div>
                        ${this.trend !== null
                            ? `<div class="o_kpi_trend ${this.trend >= 0 ? 'text-success' : 'text-danger'}">
                                <i class="fa ${this.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                ${Math.abs(this.trend).toFixed(1)}%
                               </div>`
                            : ""
                        }
                    </div>
                </div>
            `;
        }

        update(value, trend) {
            this.value = value;
            if (trend !== undefined) this.trend = trend;
            this.render();
        }
    }

    window.KpiCard = KpiCard;
})();
