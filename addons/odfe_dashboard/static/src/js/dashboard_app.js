(function () {
    "use strict";

    const API_BASE = "/api/dashboard";

    function formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    }

    function formatNumber(num) {
        return new Intl.NumberFormat("en-US").format(parseInt(num) || 0);
    }

    function getPeriodDates(period) {
        const now = new Date();
        let from = new Date();
        if (period === "day") {
            from.setHours(0, 0, 0, 0);
        } else if (period === "week") {
            from.setDate(now.getDate() - 7);
        } else if (period === "year") {
            from.setFullYear(now.getFullYear() - 1);
        } else {
            from.setMonth(now.getMonth() - 1);
        }
        return {
            date_from: from.toISOString(),
            date_to: now.toISOString(),
            period: period,
        };
    }

    async function fetchDashboardData(period) {
        const params = getPeriodDates(period);
        try {
            const response = await fetch(`${API_BASE}/data`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            return await response.json();
        } catch (err) {
            console.error("Dashboard data fetch error:", err);
            return null;
        }
    }

    function updateKPIs(data) {
        const revenueEl = document.getElementById("kpi_revenue");
        const ordersEl = document.getElementById("kpi_orders");
        const avgEl = document.getElementById("kpi_avg");
        const customersEl = document.getElementById("kpi_customers");

        if (revenueEl) revenueEl.textContent = formatCurrency(data.total_revenue);
        if (ordersEl) ordersEl.textContent = formatNumber(data.total_orders);
        if (avgEl) avgEl.textContent = formatCurrency(data.avg_order_value);
        if (customersEl) customersEl.textContent = formatNumber(data.total_customers);

        const revTrend = document.getElementById("kpi_revenue_trend");
        const ordTrend = document.getElementById("kpi_orders_trend");
        if (revTrend && data.revenue_growth !== undefined) {
            const pct = parseFloat(data.revenue_growth).toFixed(1);
            const cls = pct >= 0 ? "text-success" : "text-danger";
            const icon = pct >= 0 ? "fa-arrow-up" : "fa-arrow-down";
            revTrend.innerHTML = `<span class="${cls}"><i class="fa ${icon}"></i> ${Math.abs(pct)}% vs prev period</span>`;
        }
        if (ordTrend && data.order_growth !== undefined) {
            const pct = parseFloat(data.order_growth).toFixed(1);
            const cls = pct >= 0 ? "text-success" : "text-danger";
            const icon = pct >= 0 ? "fa-arrow-up" : "fa-arrow-down";
            ordTrend.innerHTML = `<span class="${cls}"><i class="fa ${icon}"></i> ${Math.abs(pct)}% vs prev period</span>`;
        }
    }

    function renderTopProductsTable(products) {
        const tbody = document.getElementById("top_products_body");
        if (!tbody) return;
        if (!products || !products.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data</td></tr>';
            return;
        }
        tbody.innerHTML = products
            .map(
                (p, i) =>
                    `<tr>
                        <td>${i + 1}</td>
                        <td>${p.product_name || "N/A"}</td>
                        <td>${formatNumber(p.total_qty)}</td>
                        <td>${formatCurrency(p.total_revenue)}</td>
                    </tr>`
            )
            .join("");
    }

    let dailyChart = null;
    let paymentChart = null;
    let topProductsChart = null;
    let hourlyChart = null;

    function renderDailySalesChart(dailySales) {
        if (!dailySales || !dailySales.length) return;
        const labels = dailySales.map((d) => {
            if (typeof d.date === "string") return d.date;
            const dt = new Date(d.date);
            return dt.toLocaleDateString();
        });
        const revenue = dailySales.map((d) => parseFloat(d.revenue) || 0);
        const orders = dailySales.map((d) => parseInt(d.orders) || 0);

        const options = {
            chart: { type: "line", height: 350, toolbar: { show: false } },
            series: [
                { name: "Revenue", type: "line", data: revenue },
                { name: "Orders", type: "bar", data: orders },
            ],
            xaxis: { categories: labels, labels: { rotate: -45 } },
            stroke: { width: [3, 0] },
            colors: ["#3366ff", "#ff9933"],
            fill: { opacity: [1, 0.85] },
            dataLabels: { enabled: false },
            yaxis: [
                { title: { text: "Revenue" } },
                { opposite: true, title: { text: "Orders" } },
            ],
            tooltip: { shared: true, intersect: false },
        };
        const el = document.getElementById("daily_sales_chart");
        if (!el) return;
        if (dailyChart) dailyChart.destroy();
        dailyChart = new ApexCharts(el, options);
        dailyChart.render();
    }

    function renderPaymentChart(payments) {
        if (!payments || !payments.length) return;
        const labels = payments.map((p) => p.method_name);
        const data = payments.map((p) => parseFloat(p.total) || 0);
        const colors = ["#28a745", "#007bff", "#ffc107", "#dc3545", "#17a2b8"];

        const options = {
            chart: { type: "pie", height: 350 },
            labels: labels,
            series: data,
            colors: colors.slice(0, labels.length),
            legend: { position: "bottom" },
            tooltip: {
                y: {
                    formatter: (val) => formatCurrency(val),
                },
            },
        };
        const el = document.getElementById("payment_chart");
        if (!el) return;
        if (paymentChart) paymentChart.destroy();
        paymentChart = new ApexCharts(el, options);
        paymentChart.render();
    }

    function renderTopProductsChart(products) {
        if (!products || !products.length) return;
        const labels = products.map((p) => p.product_name);
        const data = products.map((p) => parseFloat(p.total_revenue) || 0);

        const options = {
            chart: { type: "bar", height: 300, toolbar: { show: false } },
            series: [{ name: "Revenue", data: data }],
            xaxis: {
                categories: labels,
                labels: { rotate: -45, truncate: 15 },
            },
            plotOptions: {
                bar: { horizontal: false, distributed: true },
            },
            colors: ["#3366ff"],
            dataLabels: { enabled: false },
            tooltip: {
                y: { formatter: (val) => formatCurrency(val) },
            },
        };
        const el = document.getElementById("top_products_chart");
        if (!el) return;
        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new ApexCharts(el, options);
        topProductsChart.render();
    }

    function renderHourlyChart(hourlySales) {
        if (!hourlySales || !hourlySales.length) return;
        const labels = hourlySales.map((_, i) => `${i}:00`);
        const revenue = hourlySales.map((h) => parseFloat(h.revenue) || 0);

        const options = {
            chart: { type: "bar", height: 300, toolbar: { show: false } },
            series: [{ name: "Revenue", data: revenue }],
            xaxis: { categories: labels, labels: { rotate: -45 } },
            plotOptions: {
                bar: { horizontal: false, distributed: false },
            },
            colors: ["#00e396"],
            dataLabels: { enabled: false },
            tooltip: {
                y: { formatter: (val) => formatCurrency(val) },
            },
        };
        const el = document.getElementById("hourly_chart");
        if (!el) return;
        if (hourlyChart) hourlyChart.destroy();
        hourlyChart = new ApexCharts(el, options);
        hourlyChart.render();
    }

    async function loadDashboard(period) {
        const data = await fetchDashboardData(period);
        if (!data) return;
        updateKPIs(data);
        renderDailySalesChart(data.daily_sales);
        renderPaymentChart(data.payment_method_breakdown);
        renderTopProductsChart(data.top_products);
        renderHourlyChart(data.hourly_sales);
        renderTopProductsTable(data.top_products);
    }

    document.addEventListener("DOMContentLoaded", function () {
        const periodSelect = document.getElementById("period_select");
        const refreshBtn = document.getElementById("refresh_btn");

        if (periodSelect) {
            loadDashboard(periodSelect.value);
            periodSelect.addEventListener("change", function () {
                loadDashboard(this.value);
            });
        }
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function () {
                const period = periodSelect ? periodSelect.value : "month";
                loadDashboard(period);
            });
        }
    });
})();
