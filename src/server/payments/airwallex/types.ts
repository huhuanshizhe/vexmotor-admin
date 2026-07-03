export type AirwallexPaymentIntentStatus =
  | 'REQUIRES_PAYMENT_METHOD'
  | 'REQUIRES_CUSTOMER_ACTION'
  | 'REQUIRES_CAPTURE'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'CANCELLED';

export type AirwallexPaymentIntent = {
  id: string;
  request_id: string;
  amount: number;
  currency: string;
  merchant_order_id: string;
  status: AirwallexPaymentIntentStatus;
  client_secret: string;
  created_at?: string;
  updated_at?: string;
};

export type CreatePaymentIntentInput = {
  requestId: string;
  amount: number;
  currency: string;
  merchantOrderId: string;
  customerEmail?: string;
};
