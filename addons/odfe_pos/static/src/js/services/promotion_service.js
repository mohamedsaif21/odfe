export class PromotionService {
    static activePromotions = [];

    static async checkPromotions(cart) {
        const applicable = [];
        for (const promo of this.activePromotions) {
            if (this._matchesCondition(promo, cart)) {
                applicable.push(promo);
            }
        }
        return applicable;
    }

    static _matchesCondition(promo, cart) {
        if (!promo || !cart) return false;
        if (promo.min_amount && cart.subtotal < promo.min_amount) return false;
        if (promo.min_items && cart.lines.length < promo.min_items) return false;
        return true;
    }

    static applyPromotion(promo, cart) {
        if (promo.type === "percentage") {
            return cart.subtotal * (promo.value / 100);
        }
        if (promo.type === "fixed") {
            return promo.value;
        }
        return 0;
    }
}
