(function () {
    "use strict";

    const CURRENCY = "\u20B9";

    class KpiCard {
        constructor(el, options) {
            this.el = el;
            this.label = options.label || "";
            this.value = options.value || 0;
            this.trend = options.trend || null;
            this.format = options.format || "number";
            this.prefix = options.prefix || "";
            this.suffix = options.suffix || "";
            this.iconClass = options.iconClass || "fa-chart-line";
            this.iconModifier = options.iconModifier || "revenue";
            this.render();
        }

        formatValue(val) {
            const num = parseFloat(val) || 0;
            if (this.format === "currency") {
                return CURRENCY + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            }
            if (this.format === "percentage") {
                return num.toFixed(1) + "%";
            }
            return new Intl.NumberFormat("en-IN").format(num);
        }

        render() {
            if (!this.el) return;
            const trendHtml = this.trend !== null
                ? `<div class="odfe-kpi-card__trend ${this.trend >= 0 ? 'odfe-kpi-card__trend--up' : 'odfe-kpi-card__trend--down'}">
                    <i class="fa ${this.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    ${Math.abs(this.trend).toFixed(1)}%
                   </div>`
                : '';

            this.el.innerHTML = `
                <div class="odfe-kpi-card__top">
                    <div class="odfe-kpi-card__icon odfe-kpi-card__icon--${this.iconModifier}">
                        <i class="fa ${this.iconClass}"/>
                    </div>
                    ${trendHtml}
                </div>
                <div class="odfe-kpi-card__label">${this.label}</div>
                <div class="odfe-kpi-card__value">${this.prefix}${this.formatValue(this.value)}${this.suffix}</div>
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
