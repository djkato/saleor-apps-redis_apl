import { RefundType } from "avatax/lib/enums/RefundType";
import { z } from "zod";
import { Logger, createLogger } from "../../../lib/logger";
import { OrderRefundedPayload } from "../../../pages/api/webhooks/order-refunded";
import { WebhookAdapter } from "../../taxes/tax-webhook-adapter";
import { AvataxClient, RefundTransactionParams } from "../avatax-client";
import { AvataxConfig, defaultAvataxConfig } from "../avatax-connection-schema";
import { taxProviderUtils } from "../../taxes/tax-provider-utils";

class AvataxOrderRefundedPayloadTransformer {
  private logger: Logger;

  constructor() {
    this.logger = createLogger({ name: "AvataxOrderRefundedPayloadTransformer" });
  }

  transform(payload: OrderRefundedPayload, avataxConfig: AvataxConfig): RefundTransactionParams {
    this.logger.debug(
      { payload },
      "Transforming the Saleor payload for refunding order with AvaTax...",
    );

    const isFull = true;

    const transactionCode = z
      .string()
      .min(1, "Unable to refund transaction. Avatax id not found in order metadata")
      .parse(payload.order?.avataxId);

    const baseParams: Pick<RefundTransactionParams, "transactionCode" | "companyCode"> = {
      transactionCode,
      companyCode: avataxConfig.companyCode ?? defaultAvataxConfig.companyCode,
    };

    if (!isFull) {
      return {
        ...baseParams,
        model: {
          refundType: RefundType.Partial,
          refundDate: new Date(),
          refundLines: payload.order?.lines?.map((line) =>
            // todo: replace with some other code
            taxProviderUtils.resolveStringOrThrow(line.productSku),
          ),
        },
      };
    }

    return {
      ...baseParams,
      model: {
        refundType: RefundType.Full,
        refundDate: new Date(),
      },
    };
  }
}

export class AvataxOrderRefundedAdapter implements WebhookAdapter<OrderRefundedPayload, void> {
  private logger: Logger;

  constructor(private readonly config: AvataxConfig) {
    this.logger = createLogger({ name: "AvataxOrderRefundedAdapter" });
  }

  async send(payload: OrderRefundedPayload) {
    this.logger.debug(
      { payload },
      "Transforming the Saleor payload for refunding order with AvaTax...",
    );

    if (!this.config.isAutocommit) {
      throw new Error(
        "Unable to refund transaction. AvaTax can only refund commited transactions.",
      );
    }

    const client = new AvataxClient(this.config);
    const payloadTransformer = new AvataxOrderRefundedPayloadTransformer();
    const target = payloadTransformer.transform(payload, this.config);

    const response = await client.refundTransaction(target);

    this.logger.debug(
      { response },
      `Succesfully refunded the transaction of id: ${target.transactionCode}`,
    );
  }
}
