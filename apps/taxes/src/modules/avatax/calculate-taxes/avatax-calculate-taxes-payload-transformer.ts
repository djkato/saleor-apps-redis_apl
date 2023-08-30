import { DocumentType } from "avatax/lib/enums/DocumentType";
import { TaxBaseFragment } from "../../../../generated/graphql";
import { discountUtils } from "../../taxes/discount-utils";
import { avataxAddressFactory } from "../address-factory";
import { AvataxClient, CreateTransactionArgs } from "../avatax-client";
import { AvataxConfig, defaultAvataxConfig } from "../avatax-connection-schema";
import { AvataxTaxCodeMatches } from "../tax-code/avatax-tax-code-match-repository";
import { AvataxCalculateTaxesPayloadLinesTransformer } from "./avatax-calculate-taxes-payload-lines-transformer";
import { AvataxEntityTypeMatcher } from "../avatax-entity-type-matcher";
import { taxProviderUtils } from "../../taxes/tax-provider-utils";
import { CalculateTaxesPayload } from "../../../pages/api/webhooks/checkout-calculate-taxes";
import { AvataxAddressResolver } from "../order-confirmed/avatax-address-resolver";

export class AvataxCalculateTaxesPayloadTransformer {
  private matchDocumentType(config: AvataxConfig): DocumentType {
    /*
     * * For calculating taxes, we always use DocumentType.SalesOrder because it doesn't cause transaction recording.
     * * The full flow is described here: https://developer.avalara.com/ecommerce-integration-guide/sales-tax-badge/design-document-workflow/should-i-commit/
     * * config.isDocumentRecordingEnabled is used to determine if the transaction should be recorded (hence if the document type should be SalesOrder).
     * * Given that we never want to record the transaction in calculate taxes, we always return DocumentType.SalesOrder.
     */
    return DocumentType.SalesOrder;
  }

  // During the checkout process, it appears the customer id is not always available. We can use the email address instead.
  private resolveCustomerCode(payload: CalculateTaxesPayload): string {
    if (payload.taxBase.sourceObject.__typename === "Checkout") {
      return taxProviderUtils.resolveStringOrThrow(payload.taxBase.sourceObject.email);
    }

    if (payload.taxBase.sourceObject.__typename === "Order") {
      return taxProviderUtils.resolveStringOrThrow(payload.taxBase.sourceObject.userEmail);
    }

    throw new Error("Cannot resolve customer code");
  }

  async transform(
    payload: CalculateTaxesPayload,
    avataxConfig: AvataxConfig,
    matches: AvataxTaxCodeMatches,
  ): Promise<CreateTransactionArgs> {
    const payloadLinesTransformer = new AvataxCalculateTaxesPayloadLinesTransformer();
    const avataxClient = new AvataxClient(avataxConfig);
    const entityTypeMatcher = new AvataxEntityTypeMatcher({ client: avataxClient });
    const entityUseCode = await entityTypeMatcher.match(
      payload.taxBase.sourceObject.avataxEntityCode,
    );

    const customerCode = this.resolveCustomerCode(payload);
    const addressResolver = new AvataxAddressResolver();
    const addresses = addressResolver.resolve({
      from: avataxConfig.address,
      to: payload.taxBase.address!,
    });

    return {
      model: {
        type: this.matchDocumentType(avataxConfig),
        entityUseCode,
        customerCode,
        companyCode: avataxConfig.companyCode ?? defaultAvataxConfig.companyCode,
        // * commit: If true, the transaction will be committed immediately after it is created. See: https://developer.avalara.com/communications/dev-guide_rest_v2/commit-uncommit
        commit: avataxConfig.isAutocommit,
        addresses,
        currencyCode: payload.taxBase.currency,
        lines: payloadLinesTransformer.transform(payload.taxBase, avataxConfig, matches),
        date: new Date(),
        discount: discountUtils.sumDiscounts(
          payload.taxBase.discounts.map((discount) => discount.amount.amount),
        ),
      },
    };
  }
}
