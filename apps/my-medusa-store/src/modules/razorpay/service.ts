// src/modules/razorpay/service.ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import {
    InitiatePaymentInput,
    InitiatePaymentOutput,
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CapturePaymentInput,
    CapturePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    ProviderWebhookPayload,
    WebhookActionResult,
} from "@medusajs/framework/types"
import Razorpay from "razorpay"
import crypto from "crypto"

type Options = {
    key_id: string
    key_secret: string
    webhook_secret?: string
}

export class RazorpayProviderService extends AbstractPaymentProvider<Options> {
    static identifier = "razorpay"
    protected razorpay_: Razorpay
    protected container_: any
    protected options_: Options

    constructor(container: any, options: Options) {
        super(container, options)
        this.container_ = container
        this.options_ = options

        this.razorpay_ = new Razorpay({
            key_id: options.key_id,
            key_secret: options.key_secret,
        })
    }

    // src/modules/razorpay/service.ts (snippet for initiatePayment)
    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        try {
            const amountInPaise = Math.round(Number(input.amount) * 100)

            // Optional: Extract vendor transfers passed from cart/checkout context
            // transfers example: [{ account: "acc_01KQFQ4RA5SZRAW", amount: 8800 }]
            const context = input.context as any
            const transfers = context?.transfers ?? []

            const orderPayload: any = {
                amount: amountInPaise,
                currency: (input.currency_code ?? "INR").toUpperCase(),
                notes: {
                    context: JSON.stringify(input.context ?? {}),
                },
            }

            // Attach transfers if vendors exist in cart context
            if (transfers.length > 0) {
                orderPayload.transfers = transfers.map((t: any) => ({
                    account: t.account, // Razorpay Sub-account ID (e.g., acc_01KQFQ4RA5SZRAW)
                    amount: Math.round(Number(t.amount) * 100), // Vendor portion in paise
                    currency: (input.currency_code ?? "INR").toUpperCase(),
                    on_hold: 0, // 0 = Instant transfer, 1 = Hold until fulfillment
                }))
            }

            const order = await this.razorpay_.orders.create(orderPayload)

            return {
                id: order.id,
                data: {
                    razorpay_order_id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    status: order.status,
                },
            }
        } catch (error: any) {
            return {
                id: "",
                data: {
                    error: {
                        message: error.message ?? "Failed to create Razorpay order",
                        code: "RAZORPAY_INITIATE_ERROR",
                        detail: error,
                    },
                },
            }
        }
    }

    async authorizePayment(
        input: AuthorizePaymentInput
    ): Promise<AuthorizePaymentOutput> {
        const data = input.data ?? {}
        const razorpayPaymentId = data.razorpay_payment_id as string
        const razorpaySignature = data.razorpay_signature as string
        const razorpayOrderId = data.razorpay_order_id as string

        // If client provided payment_id & signature, verify authenticity
        if (razorpayPaymentId && razorpaySignature && razorpayOrderId) {
            const body = razorpayOrderId + "|" + razorpayPaymentId
            const expectedSignature = crypto
                .createHmac("sha256", this.options_.key_secret)
                .update(body.toString())
                .digest("hex")

            if (expectedSignature !== razorpaySignature) {
                return {
                    status: "error",
                    data: {
                        ...data,
                        error: "Invalid Razorpay payment signature",
                    },
                }
            }
        }

        return {
            status: "authorized",
            data,
        }
    }

    async capturePayment(
        input: CapturePaymentInput
    ): Promise<CapturePaymentOutput> {
        return { data: input.data ?? {} }
    }

    async cancelPayment(
        input: CancelPaymentInput
    ): Promise<CancelPaymentOutput> {
        return { data: input.data ?? {} }
    }

    async deletePayment(
        input: DeletePaymentInput
    ): Promise<DeletePaymentOutput> {
        return { data: input.data ?? {} }
    }

    async getPaymentStatus(
        input: GetPaymentStatusInput
    ): Promise<GetPaymentStatusOutput> {
        const razorpayPaymentId = input.data?.razorpay_payment_id as string

        if (razorpayPaymentId) {
            try {
                const payment = await this.razorpay_.payments.fetch(razorpayPaymentId)
                if (payment.status === "captured" || payment.status === "authorized") {
                    return { status: "authorized", data: input.data ?? {} }
                }
                if (payment.status === "failed") {
                    return { status: "error", data: input.data ?? {} }
                }
            } catch {
                // Fall back to default status
            }
        }

        return { status: "authorized", data: input.data ?? {} }
    }

    async refundPayment(
        input: RefundPaymentInput
    ): Promise<RefundPaymentOutput> {
        const paymentId = input.data?.razorpay_payment_id as string | undefined

        if (paymentId) {
            try {
                const refund = await this.razorpay_.payments.refund(paymentId, {
                    amount: Math.round(Number(input.amount) * 100),
                })

                return {
                    data: {
                        ...input.data,
                        refund_id: refund.id,
                        status: "refunded",
                    },
                }
            } catch (error: any) {
                return {
                    data: {
                        error: {
                            message: error.message ?? "Refund failed",
                            code: "RAZORPAY_REFUND_ERROR",
                            detail: error,
                        },
                    },
                }
            }
        }

        return { data: input.data ?? {} }
    }

    async retrievePayment(
        input: RetrievePaymentInput
    ): Promise<RetrievePaymentOutput> {
        return { data: input.data ?? {} }
    }

    async updatePayment(
        input: UpdatePaymentInput
    ): Promise<UpdatePaymentOutput> {
        return this.initiatePayment(input)
    }

    async getWebhookActionAndData(
        payload: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const webhookSecret = this.options_.webhook_secret

        // Get the raw body - using rawData instead of rawBody
        const rawBody = payload.rawData
        const bodyPayload = typeof rawBody === 'string'
            ? rawBody
            : rawBody.toString()

        // Get the signature from headers
        const signature = (payload.headers?.["x-razorpay-signature"] ?? "") as string

        // Verify webhook signature if webhook secret is configured
        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(bodyPayload)
                .digest("hex")

            if (signature !== expectedSignature) {
                return {
                    action: "requires_more",
                    data: {
                        session_id: "invalid_signature",
                        amount: 0,
                    },
                }
            }
        }

        // Parse the body - using payload.data as the event data
        const eventData = payload.data as any
        const eventType = eventData.event

        // Helper function to extract payment ID or order ID
        const getSessionId = (data: any): string => {
            return data?.payload?.payment?.entity?.id ||
                data?.payload?.payment?.entity?.order_id ||
                data?.payload?.refund?.entity?.payment_id ||
                data?.payload?.transfer?.entity?.payment_id ||
                "unknown"
        }

        // Helper function to extract amount
        const getAmount = (data: any): number => {
            return data?.payload?.payment?.entity?.amount ||
                data?.payload?.refund?.entity?.amount ||
                data?.payload?.transfer?.entity?.amount ||
                0
        }

        switch (eventType) {
            case "payment.captured":
                return {
                    action: "captured",
                    data: {
                        session_id: getSessionId(eventData),
                        amount: getAmount(eventData),
                    },
                }

            case "payment.authorized":
                return {
                    action: "authorized",
                    data: {
                        session_id: getSessionId(eventData),
                        amount: getAmount(eventData),
                    },
                }

            case "payment.failed":
                // Store error info in session_id with a prefix
                const errorMsg = eventData.payload?.payment?.entity?.error_description || "Payment failed"
                const errorCode = eventData.payload?.payment?.entity?.error_code || ""
                return {
                    action: "requires_more",
                    data: {
                        session_id: `failed:${errorCode}:${errorMsg.substring(0, 50)}`,
                        amount: getAmount(eventData),
                    },
                }

            case "refund.created":
                return {
                    action: "requires_more",
                    data: {
                        session_id: `refund:${eventData.payload?.refund?.entity?.id || "unknown"}`,
                        amount: getAmount(eventData),
                    },
                }

            case "refund.failed":
                return {
                    action: "requires_more",
                    data: {
                        session_id: `refund_failed:${eventData.payload?.refund?.entity?.id || "unknown"}`,
                        amount: getAmount(eventData),
                    },
                }

            case "transfer.created":
                return {
                    action: "requires_more",
                    data: {
                        session_id: `transfer:${eventData.payload?.transfer?.entity?.id || "unknown"}`,
                        amount: getAmount(eventData),
                    },
                }

            case "transfer.failed":
                return {
                    action: "requires_more",
                    data: {
                        session_id: `transfer_failed:${eventData.payload?.transfer?.entity?.id || "unknown"}`,
                        amount: getAmount(eventData),
                    },
                }

            default:
                return {
                    action: "not_supported",
                    data: {
                        session_id: `unhandled:${eventType}`,
                        amount: 0,
                    }
                }
        }
    }
}