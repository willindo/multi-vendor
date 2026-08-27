import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import Razorpay from "razorpay";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { account_holder_id } = req.params;

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    try {
        const customer = await razorpay.customers.fetch(account_holder_id);

        res.json({ customer });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { account_holder_id } = req.params;
    // Explicitly type the body so TS knows what to expect
    const { payment_method } = req.body as { payment_method: string };

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    try {
        // Cast payload to `any` because Razorpay’s TS types don’t expose `notes`
        const customer = await razorpay.customers.edit(
            account_holder_id,
            {
                notes: { preferred_payment_method: payment_method },
            } as any
        );

        res.json({ customer });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};
