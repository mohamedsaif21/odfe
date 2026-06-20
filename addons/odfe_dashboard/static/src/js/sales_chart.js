(function () {
    "use strict";

    class SalesChart {
        constructor(el, options) {
            this.el = typeof el === "string" ? document.getElementById(el) : el;
            if (!this.el) throw new Error("SalesChart: element not found");

            this.options = Object.assign(
                {
                    type: "line",
                    height: 350,
                    width: "100%",
                    colors: ["#3366ff", "#ff9933", "#00e396", "#ff4560"],
                    toolbar: false,
                    dataLabels: false,
                    animations: { enabled: true, dynamicAnimation: { speed: 500 } },
                },
                options
            );
            this.chart = null;
        }

        render(series, labels) {
            const apexConfig = {
                chart: {
                    type: this.options.type,
                    height: this.options.height,
                    width: this.options.width,
                    toolbar: { show: this.options.toolbar },
                    animations: this.options.animations,
                },
                series: series,
                xaxis: {
                    categories: labels || [],
                    labels: { rotate: this.options.xRotateLabels || -45 },
                },
                colors: this.options.colors,
                dataLabels: { enabled: this.options.dataLabels },
                stroke: { curve: "smooth", width: 2 },
                fill: { opacity: 0.85 },
                legend: { position: "bottom" },
                tooltip: { shared: true, intersect: false },
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
            const apexConfig = {
                chart: { type: "pie", height: this.options.height },
                series: data,
                labels: labels,
                colors: this.options.colors,
                legend: { position: "bottom" },
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
            const apexConfig = {
                chart: { type: "donut", height: this.options.height },
                series: data,
                labels: labels,
                colors: this.options.colors,
                legend: { position: "bottom" },
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
            const apexConfig = {
                chart: { type: "heatmap", height: this.options.height, toolbar: { show: this.options.toolbar } },
                series: series,
                xaxis: { categories: labels },
                colors: ["#008FFB"],
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
