(function () {
    "use strict";

    const CURRENCY = "\u20B9";

    class SalesChart {
        constructor(el, options) {
            this.el = typeof el === "string" ? document.getElementById(el) : el;
            if (!this.el) throw new Error("SalesChart: element not found");

            this.options = Object.assign(
                {
                    type: "line",
                    height: 350,
                    width: "100%",
                    colors: ["#14B8A6", "#D4A373", "#38BDF8", "#F59E0B"],
                    toolbar: false,
                    dataLabels: false,
                    animations: { enabled: true, dynamicAnimation: { speed: 500 } },
                },
                options
            );
            this.chart = null;
        }

        _baseConfig() {
            return {
                chart: {
                    background: "transparent",
                    grid: { borderColor: "rgba(255,255,255,0.04)" },
                },
                xaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
                yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
                tooltip: { theme: "dark" },
                legend: { labels: { colors: "#94A3B8" } },
                grid: { borderColor: "rgba(255,255,255,0.04)" },
            };
        }

        render(series, labels) {
            const base = this._baseConfig();
            const apexConfig = {
                ...base,
                chart: {
                    type: this.options.type,
                    height: this.options.height,
                    width: this.options.width,
                    toolbar: { show: this.options.toolbar },
                    animations: this.options.animations,
                    background: "transparent",
                },
                series: series,
                xaxis: {
                    categories: labels || [],
                    labels: { rotate: this.options.xRotateLabels || -45, style: { colors: "#64748B", fontSize: "11px" } },
                },
                colors: this.options.colors,
                dataLabels: { enabled: this.options.dataLabels },
                stroke: { curve: "smooth", width: 2 },
                fill: { opacity: 0.85 },
                legend: { position: "bottom", labels: { colors: "#94A3B8" } },
                tooltip: { shared: true, intersect: false, theme: "dark" },
            };

            if (this.chart) this.chart.destroy();
            this.chart = new ApexCharts(this.el, apexConfig);
            this.chart.render();
        }

        renderBar(series, labels) {
            this.render(
                series.map((s) => ({ ...s, type: "bar" })),
                labels
            );
        }

        renderLine(series, labels) {
            this.render(
                series.map((s) => ({ ...s, type: "line" })),
                labels
            );
        }

        renderPie(data, labels) {
            if (this.chart) this.chart.destroy();
            const base = this._baseConfig();
            const apexConfig = {
                ...base,
                chart: { type: "pie", height: this.options.height, background: "transparent" },
                series: data,
                labels: labels,
                colors: this.options.colors,
                legend: { position: "bottom", labels: { colors: "#94A3B8" } },
                responsive: [
                    {
                        breakpoint: 480,
                        options: {
                            chart: { width: "100%" },
                            legend: { position: "bottom" },
                        },
                    },
                ],
            };
            this.chart = new ApexCharts(this.el, apexConfig);
            this.chart.render();
        }

        renderDonut(data, labels) {
            if (this.chart) this.chart.destroy();
            const base = this._baseConfig();
            const apexConfig = {
                ...base,
                chart: { type: "donut", height: this.options.height, background: "transparent" },
                series: data,
                labels: labels,
                colors: this.options.colors,
                legend: { position: "bottom", labels: { colors: "#94A3B8" } },
                plotOptions: {
                    pie: {
                        donut: {
                            size: "55%",
                            labels: {
                                show: true,
                                total: { show: true, label: "Total", formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0) },
                            },
                        },
                    },
                },
            };
            this.chart = new ApexCharts(this.el, apexConfig);
            this.chart.render();
        }

        renderHeatmap(series, labels) {
            if (this.chart) this.chart.destroy();
            const base = this._baseConfig();
            const apexConfig = {
                ...base,
                chart: { type: "heatmap", height: this.options.height, toolbar: { show: this.options.toolbar }, background: "transparent" },
                series: series,
                xaxis: { categories: labels, labels: { style: { colors: "#64748B", fontSize: "11px" } } },
                colors: ["#14B8A6"],
                dataLabels: { enabled: false },
            };
            this.chart = new ApexCharts(this.el, apexConfig);
            this.chart.render();
        }

        destroy() {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        }
    }

    window.SalesChart = SalesChart;
})();
