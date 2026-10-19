package app.old2new.twa;

import com.google.androidbrowserhelper.playbilling.digitalgoods.DigitalGoodsRequestHandler;

/**
 * Trusted Web Activity delegation service. Chrome binds to this service from
 * the TWA and routes Digital Goods API calls made by old2new.app
 * (window.getDigitalGoodsService('https://play.google.com/billing') —
 * getDetails / listPurchases / consume) to Google Play Billing through the
 * androidbrowserhelper "billing" module. Purchases themselves go through the
 * Payment Request API → PaymentActivity (declared in AndroidManifest.xml).
 */
public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        registerExtraCommandHandler(new DigitalGoodsRequestHandler(getApplicationContext()));
    }
}
