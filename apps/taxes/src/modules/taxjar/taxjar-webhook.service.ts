import { AuthData } from "@saleor/app-sdk/APL";
import {
  OrderCancelledEventSubscriptionFragment,
  OrderConfirmedSubscriptionFragment,
} from "../../../generated/graphql";
import { Logger, createLogger } from "../../lib/logger";
import { CalculateTaxesPayload } from "../../pages/api/webhooks/checkout-calculate-taxes";
import { OrderRefundedPayload } from "../../pages/api/webhooks/order-refunded";
import { ProviderWebhookService } from "../taxes/tax-provider-webhook";
import { TaxJarCalculateTaxesAdapter } from "./calculate-taxes/taxjar-calculate-taxes-adapter";
import { TaxJarOrderConfirmedAdapter } from "./order-confirmed/taxjar-order-confirmed-adapter";
import { TaxJarClient } from "./taxjar-client";
import { TaxJarConfig } from "./taxjar-connection-schema";

export class TaxJarWebhookService implements ProviderWebhookService {
  client: TaxJarClient;
  private logger: Logger;
  private config: TaxJarConfig;

  constructor(
    config: TaxJarConfig,
    private authData: AuthData,
  ) {
    const taxJarClient = new TaxJarClient(config);

    this.client = taxJarClient;
    this.config = config;
    this.logger = createLogger({
      name: "TaxJarWebhookService",
    });
  }

  async calculateTaxes(payload: CalculateTaxesPayload) {
    const adapter = new TaxJarCalculateTaxesAdapter(this.config, this.authData);

    const response = await adapter.send(payload);

    return response;
  }

  async confirmOrder(order: OrderConfirmedSubscriptionFragment) {
    const adapter = new TaxJarOrderConfirmedAdapter(this.config, this.authData);

    const response = await adapter.send({ order });

    return response;
  }

  async cancelOrder(payload: OrderCancelledEventSubscriptionFragment) {
    // todo: implement
    this.logger.debug("cancelOrder not implement for TaxJar");
  }

  async refundOrder(payload: OrderRefundedPayload) {
    // todo: implement
    this.logger.debug("refundOrder not implement for TaxJar");
  }
}
