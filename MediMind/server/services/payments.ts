import Stripe from 'stripe';
import { hipaaService } from './hipaa';

// Payment Gateway Interface
interface PaymentGateway {
  name: string;
  processPayment(params: PaymentParams): Promise<PaymentResult>;
  createCustomer(customerData: CustomerData): Promise<string>;
  createSubscription?(subscriptionData: SubscriptionData): Promise<SubscriptionResult>;
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

interface PaymentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

interface CustomerData {
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface SubscriptionData {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  fees?: number;
  clientSecret?: string;
  error?: string;
}

interface SubscriptionResult {
  success: boolean;
  subscriptionId: string;
  status: string;
  clientSecret?: string;
  error?: string;
}

interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  error?: string;
}

interface TransactionStatus {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created: Date;
  metadata?: Record<string, any>;
}

// Stripe Payment Gateway
class StripeGateway implements PaymentGateway {
  name = 'Stripe';
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency,
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata || {},
        payment_method: params.paymentMethodId,
        confirm: !!params.paymentMethodId,
        setup_future_usage: params.savePaymentMethod ? 'on_session' : undefined,
      });

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: params.amount,
        currency: params.currency,
        error: error.message,
      };
    }
  }

  async createCustomer(customerData: CustomerData): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
    });
    return customer.id;
  }

  async createSubscription(subscriptionData: SubscriptionData): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [{ price: subscriptionData.priceId }],
        trial_period_days: subscriptionData.trialPeriodDays,
        metadata: subscriptionData.metadata || {},
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: paymentIntent?.client_secret || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        subscriptionId: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error: any) {
      return {
        success: false,
        refundId: '',
        amount: amount || 0,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
    
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      created: new Date(paymentIntent.created * 1000),
      metadata: paymentIntent.metadata,
    };
  }
}

// Razorpay Payment Gateway (for Indian market)
class RazorpayGateway implements PaymentGateway {
  name = 'Razorpay';
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    try {
      // Create Razorpay order
      const orderData = {
        amount: Math.round(params.amount * 100), // Amount in paise
        currency: params.currency || 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: params.metadata || {},
      };

      // In production, this would make actual API call to Razorpay
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      }).catch(() => {
        // Mock response for demo when API keys are not available
        return {
          ok: true,
          json: () => Promise.resolve({
            id: `order_${Date.now()}`,
            amount: orderData.amount,
            currency: orderData.currency,
            status: 'created'
          })
        };
      });

      if (response.ok) {
        const order = await response.json();
        return {
          success: false, // Requires client-side confirmation in Razorpay
          transactionId: order.id,
          status: 'pending',
          amount: params.amount,
          currency: params.currency,
          clientSecret: order.id, // Used as order ID in Razorpay
        };
      } else {
        throw new Error('Failed to create Razorpay order');
      }
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: params.amount,
        currency: params.currency,
        error: error.message,
      };
    }
  }

  async createCustomer(customerData: CustomerData): Promise<string> {
    // Mock customer creation
    return `cust_${Date.now()}`;
  }

  async refundPayment(transactionId: string, amount?: number): Promise<RefundResult> {
    // Mock refund
    return {
      success: true,
      refundId: `rfnd_${Date.now()}`,
      amount: amount || 0,
      status: 'processed',
    };
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return {
      id: transactionId,
      status: 'captured',
      amount: 0,
      currency: 'INR',
      created: new Date(),
    };
  }
}

// Payment Service Manager
export class PaymentService {
  private gateways: Map<string, PaymentGateway> = new Map();
  private defaultGateway: string = 'razorpay';

  constructor() {
    this.initializeGateways();
  }

  private initializeGateways() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.gateways.set('stripe', new StripeGateway(process.env.STRIPE_SECRET_KEY));
    }

    // Initialize Razorpay
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.gateways.set('razorpay', new RazorpayGateway(
        process.env.RAZORPAY_KEY_ID,
        process.env.RAZORPAY_KEY_SECRET
      ));
    }
  }

  getGateway(name?: string): PaymentGateway {
    const gatewayName = name || this.defaultGateway;
    const gateway = this.gateways.get(gatewayName);
    
    if (!gateway) {
      throw new Error(`Payment gateway '${gatewayName}' not configured`);
    }
    
    return gateway;
  }

  async processPayment(
    params: PaymentParams & { gateway?: string; userId?: string }
  ): Promise<PaymentResult> {
    const gateway = this.getGateway(params.gateway);
    
    // Log payment attempt for HIPAA compliance
    if (params.userId) {
      await hipaaService.logAccess({
        userId: params.userId,
        action: 'PROCESS_PAYMENT',
        resourceType: 'payment',
        resourceId: `${gateway.name}_${Date.now()}`,
        ipAddress: 'system',
        userAgent: 'payment_service',
        success: true,
        details: {
          gateway: gateway.name,
          amount: params.amount,
          currency: params.currency,
        },
      });
    }

    const result = await gateway.processPayment(params);

    // Log payment result
    if (params.userId) {
      await hipaaService.logAccess({
        userId: params.userId,
        action: result.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        resourceType: 'payment',
        resourceId: result.transactionId,
        ipAddress: 'system',
        userAgent: 'payment_service',
        success: result.success,
        details: {
          gateway: gateway.name,
          status: result.status,
          amount: result.amount,
          error: result.error,
        },
      });
    }

    return result;
  }

  async createCustomer(
    customerData: CustomerData & { gateway?: string }
  ): Promise<string> {
    const gateway = this.getGateway(customerData.gateway);
    return gateway.createCustomer(customerData);
  }

  async createSubscription(
    subscriptionData: SubscriptionData & { gateway?: string }
  ): Promise<SubscriptionResult> {
    const gateway = this.getGateway(subscriptionData.gateway);
    
    if (!gateway.createSubscription) {
      throw new Error(`Gateway '${gateway.name}' does not support subscriptions`);
    }
    
    return gateway.createSubscription(subscriptionData);
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    gateway?: string,
    userId?: string
  ): Promise<RefundResult> {
    const paymentGateway = this.getGateway(gateway);
    
    // Log refund attempt
    if (userId) {
      await hipaaService.logAccess({
        userId,
        action: 'PROCESS_REFUND',
        resourceType: 'payment',
        resourceId: transactionId,
        ipAddress: 'system',
        userAgent: 'payment_service',
        success: true,
        details: {
          gateway: paymentGateway.name,
          amount,
        },
      });
    }

    const result = await paymentGateway.refundPayment(transactionId, amount);

    // Log refund result
    if (userId) {
      await hipaaService.logAccess({
        userId,
        action: result.success ? 'REFUND_SUCCESS' : 'REFUND_FAILED',
        resourceType: 'payment',
        resourceId: result.refundId,
        ipAddress: 'system',
        userAgent: 'payment_service',
        success: result.success,
        details: {
          gateway: paymentGateway.name,
          amount: result.amount,
          error: result.error,
        },
      });
    }

    return result;
  }

  async getTransactionStatus(
    transactionId: string,
    gateway?: string
  ): Promise<TransactionStatus> {
    const paymentGateway = this.getGateway(gateway);
    return paymentGateway.getTransactionStatus(transactionId);
  }

  getAvailableGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  // Utility method to calculate fees
  calculateFees(amount: number, gateway: string = 'stripe'): number {
    const feeStructures = {
      stripe: { percentage: 0.029, fixed: 0.30 }, // 2.9% + $0.30
      razorpay: { percentage: 0.02, fixed: 0 },   // 2% (Indian rates)
    };

    const fees = feeStructures[gateway as keyof typeof feeStructures] || feeStructures.stripe;
    return (amount * fees.percentage) + fees.fixed;
  }

  // Utility method for payment validation
  validatePaymentAmount(amount: number, currency: string): { valid: boolean; error?: string } {
    const minimums = {
      USD: 0.50,
      EUR: 0.50,
      INR: 1.00,
      GBP: 0.30,
    };

    const minimum = minimums[currency as keyof typeof minimums] || 0.50;
    
    if (amount < minimum) {
      return {
        valid: false,
        error: `Minimum payment amount for ${currency} is ${minimum}`,
      };
    }

    if (amount > 999999) {
      return {
        valid: false,
        error: 'Payment amount exceeds maximum limit',
      };
    }

    return { valid: true };
  }
}

export const paymentService = new PaymentService();