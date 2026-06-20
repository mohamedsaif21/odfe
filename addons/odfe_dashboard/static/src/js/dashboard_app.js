(function () {
    "use strict";

    const API_BASE = "/api/dashboard";
    const CURRENCY = "\u20B9";

    function formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return CURRENCY + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function formatCurrencyDecimal(amount) {
        const num = parseFloat(amount) || 0;
        return CURRENCY + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatNumber(num) {
        return new Intl.NumberFormat("en-IN").format(parseInt(num) || 0);
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
        if (avgEl) avgEl.textContent = formatCurrencyDecimal(data.avg_order_value);
        if (customersEl) customersEl.textContent = formatNumber(data.total_customers);

        const revTrend = document.getElementById("kpi_revenue_trend");
        const ordTrend = document.getElementById("kpi_orders_trend");
        if (revTrend && data.revenue_growth !== undefined) {
            const pct = parseFloat(data.revenue_growth).toFixed(1);
            const cls = pct >= 0 ? "odfe-kpi-card__trend--up" : "odfe-kpi-card__trend--down";
            const icon = pct >= 0 ? "fa-arrow-up" : "fa-arrow-down";
            revTrend.className = `odfe-kpi-card__trend ${cls}`;
            revTrend.innerHTML = `<i class="fa ${icon}"></i> ${Math.abs(pct)}%`;
        }
        if (ordTrend && data.order_growth !== undefined) {
            const pct = parseFloat(data.order_growth).toFixed(1);
            const cls = pct >= 0 ? "odfe-kpi-card__trend--up" : "odfe-kpi-card__trend--down";
            const icon = pct >= 0 ? "fa-arrow-up" : "fa-arrow-down";
            ordTrend.className = `odfe-kpi-card__trend ${cls}`;
            ordTrend.innerHTML = `<i class="fa ${icon}"></i> ${Math.abs(pct)}%`;
        }
    }

    function renderPopularMenu(products) {
        const container = document.getElementById("popular_menu_list");
        if (!container) return;
        if (!products || !products.length) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--odfe-text-tertiary);">No data</div>';
            return;
        }
        const emojis = ["☕", "🍵", "🥤", "🍰", "🧁", "🥐", "🍝", "🥗", "🍕", "🥪"];
        container.innerHTML = products.slice(0, 6).map((p, i) => `
            <div class="odfe-popular-menu__item">
                <div class="odfe-popular-menu__rank" ${i === 0 ? 'style="background: var(--odfe-gold-light); color: var(--odfe-gold);"' : ''}>${i + 1}</div>
                <div class="odfe-popular-menu__image" style="display: flex; align-items: center; justify-content: center; font-size: 22px;">
                    ${emojis[i % emojis.length]}
                </div>
                <div class="odfe-popular-menu__info">
                    <div class="odfe-popular-menu__name">${p.product_name || "N/A"}</div>
                    <div class="odfe-popular-menu__category">${p.category || "Menu"}</div>
                </div>
                <div class="odfe-popular-menu__sales">${formatNumber(p.total_qty)} sold</div>
            </div>
        `).join("");
    }

    function renderRecentOrders(orders) {
        const container = document.getElementById("activity_feed");
        if (!container || !orders || !orders.length) return;
        container.innerHTML = orders.slice(0, 5).map(o => {
            const icon = o.state === "paid" ? "fa-check-circle" : o.state === "done" ? "fa-flag-checkered" : "fa-clock-o";
            const color = o.state === "paid" ? "var(--odfe-success)" : "var(--odfe-text-tertiary)";
            return `
                <div class="odfe-timeline__item">
                    <div class="odfe-timeline__dot" style="color: ${color};"><i class="fa ${icon}"/></div>
                    <div class="odfe-timeline__content">
                        <div class="odfe-timeline__text">Order <strong>#${o.name || o.id}</strong> &mdash; ${o.customer_name || "Walk-in"}</div>
                        <div class="odfe-timeline__when">${o.time || ""} &middot; ${formatCurrency(o.amount_total || 0)}</div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function renderPeakHoursGrid(hourlySales) {
        const grid = document.getElementById("peak_hours_grid");
        if (!grid || !hourlySales || !hourlySales.length) return;
        grid.innerHTML = hourlySales.map(h => {
            const rev = parseFloat(h.revenue) || 0;
            let level = "low";
            if (rev > 0) level = "low";
            if (rev > 2000) level = "medium";
            if (rev > 5000) level = "high";
            if (rev > 10000) level = "peak";
            return `<div class="odfe-peak-hours__cell odfe-peak-hours__cell--${level}" title="${formatCurrency(rev)}"></div>`;
        }).join("");
    }

    function renderPaymentBreakdown(payments) {
        const container = document.getElementById("payment_breakdown_list");
        const bar = document.getElementById("payment_breakdown_bar");
        if (!container) return;
        if (!payments || !payments.length) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--odfe-text-tertiary);">No data</div>';
            return;
        }
        const total = payments.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
        const colors = ["#22C55E", "#38BDF8", "#F59E0B", "#EF4444", "#A78BFA"];
        container.innerHTML = payments.map((p, i) => {
            const pct = total > 0 ? ((parseFloat(p.total) || 0) / total * 100).toFixed(1) : 0;
            return `
                <div class="odfe-payment-breakdown__item">
                    <div class="odfe-payment-breakdown__item-label">
                        <div class="odfe-payment-breakdown__item-dot" style="background: ${colors[i % colors.length]};"></div>
                        <span>${p.method_name || "Other"}</span>
                    </div>
                    <div class="odfe-payment-breakdown__item-value">${formatCurrency(p.total)} <span style="color: var(--odfe-text-tertiary); font-size: 11px;">(${pct}%)</span></div>
                </div>
            `;
        }).join("");
        if (bar) {
            bar.innerHTML = payments.map((p, i) => {
                const pct = total > 0 ? ((parseFloat(p.total) || 0) / total * 100) : 0;
                return `<span style="width: ${pct}%; background: ${colors[i % colors.length]};"></span>`;
            }).join("");
        }
    }

    let dailyChart = null;
    let paymentChart = null;
    let topProductsChart = null;
    let hourlyChart = null;

    const apexTheme = {
        chart: { background: "transparent" },
        grid: { borderColor: "rgba(255,255,255,0.04)" },
        xaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
        yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
        tooltip: { theme: "dark" },
        legend: { labels: { colors: "#94A3B8" } },
    };

    function renderDailySalesChart(dailySales) {
        if (!dailySales || !dailySales.length) return;
        const labels = dailySales.map((d) => {
            if (typeof d.date === "string") return d.date;
            const dt = new Date(d.date);
            return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        });
        const revenue = dailySales.map((d) => parseFloat(d.revenue) || 0);
        const orders = dailySales.map((d) => parseInt(d.orders) || 0);

        const options = {
            ...apexTheme,
            chart: { type: "line", height: 300, toolbar: { show: false }, background: "transparent" },
            series: [
                { name: "Revenue", type: "area", data: revenue },
                { name: "Orders", type: "bar", data: orders },
            ],
            xaxis: { categories: labels, labels: { rotate: -45, style: { colors: "#64748B", fontSize: "11px" } } },
            stroke: { width: [2, 0], curve: "smooth" },
            colors: ["#14B8A6", "#D4A373"],
            fill: { type: ["gradient", "solid"], opacity: [0.15, 0.85] },
            dataLabels: { enabled: false },
            yaxis: [
                { title: { text: "Revenue", style: { color: "#64748B" } }, labels: { style: { colors: "#64748B" } } },
                { opposite: true, title: { text: "Orders", style: { color: "#64748B" } }, labels: { style: { colors: "#64748B" } } },
            ],
            tooltip: { shared: true, intersect: false, theme: "dark" },
            grid: { borderColor: "rgba(255,255,255,0.04)" },
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
        const colors = ["#22C55E", "#38BDF8", "#F59E0B", "#EF4444", "#A78BFA"];

        const options = {
            ...apexTheme,
            chart: { type: "donut", height: 300, background: "transparent" },
            labels: labels,
            series: data,
            colors: colors.slice(0, labels.length),
            legend: { position: "bottom", labels: { colors: "#94A3B8" } },
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%",
                        labels: { show: false },
                    },
                },
            },
            tooltip: { theme: "dark" },
        };
        const el = document.getElementById("payment_chart");
        if (!el) return;
        if (paymentChart) paymentChart.destroy();
        paymentChart = new ApexCharts(el, options);
        paymentChart.render();
    }

    function renderTopProductsChart(products) {
        if (!products || !products.length) return;
        const labels = products.slice(0, 8).map((p) => p.product_name);
        const data = products.slice(0, 8).map((p) => parseFloat(p.total_revenue) || 0);

        const options = {
            ...apexTheme,
            chart: { type: "bar", height: 280, toolbar: { show: false }, background: "transparent" },
            series: [{ name: "Revenue", data: data }],
            xaxis: {
                categories: labels,
                labels: { rotate: -45, style: { colors: "#64748B", fontSize: "11px" }, truncate: 15 },
            },
            plotOptions: {
                bar: { horizontal: true, distributed: true, borderRadius: 6, barHeight: "60%" },
            },
            colors: ["#14B8A6", "#D4A373", "#38BDF8", "#F59E0B", "#22C55E", "#EF4444", "#A78BFA", "#F472B6"],
            dataLabels: { enabled: false },
            tooltip: { theme: "dark" },
            grid: { borderColor: "rgba(255,255,255,0.04)" },
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
            ...apexTheme,
            chart: { type: "bar", height: 280, toolbar: { show: false }, background: "transparent" },
            series: [{ name: "Revenue", data: revenue }],
            xaxis: { categories: labels, labels: { rotate: -45, style: { colors: "#64748B", fontSize: "11px" } } },
            plotOptions: {
                bar: { horizontal: false, distributed: false, borderRadius: 4, columnWidth: "70%" },
            },
            colors: ["#14B8A6"],
            fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3 } },
            dataLabels: { enabled: false },
            tooltip: { theme: "dark" },
            grid: { borderColor: "rgba(255,255,255,0.04)" },
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
        renderPopularMenu(data.top_products);
        renderRecentOrders(data.recent_orders);
        renderPeakHoursGrid(data.hourly_sales);
        renderPaymentBreakdown(data.payment_method_breakdown);
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
