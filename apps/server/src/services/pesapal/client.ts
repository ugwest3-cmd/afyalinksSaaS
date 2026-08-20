import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger.js';

export interface SubmitOrderParams {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationId: string;
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface SubmitOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: { error_type: string; code: string; message: string };
  status?: string;
}

export interface TransactionStatus {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number;
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error: { error_type: string; code: string; message: string } | null;
  status: string;
}

export class PesaPalClient {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private axiosInstance: AxiosInstance;

  constructor(consumerKey: string, consumerSecret: string, environment: 'SANDBOX' | 'LIVE') {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.baseUrl = environment === 'LIVE' ? 'https://pay.pesapal.com/v3' : 'https://cybqa.pesapal.com/pesapalv3';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  public async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken || "";
    }

    try {
      const response = await this.axiosInstance.post('/api/Auth/RequestToken', {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret
      });

      if (response.data && response.data.token) {
        this.accessToken = response.data.token;
        const expiryDate = new Date(response.data.expiryDate);
        this.tokenExpiry = new Date(expiryDate.getTime() - 5 * 60000); // 5 minutes buffer
        
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        return this.accessToken || "";
      }
      
      throw new Error('Failed to obtain PesaPal token');
    } catch (error) {
      logger.error({ error }, 'PesaPal authentication failed');
      throw error;
    }
  }

  public async submitOrderRequest(params: SubmitOrderParams): Promise<SubmitOrderResponse> {
    await this.authenticate();

    try {
      const payload = {
        id: params.merchantReference,
        currency: params.currency,
        amount: params.amount,
        description: params.description,
        callback_url: params.callbackUrl,
        notification_id: params.notificationId,
        billing_address: {
          phone_number: params.phoneNumber,
          email_address: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
        }
      };

      const response = await this.axiosInstance.post('/api/Transactions/SubmitOrderRequest', payload);
      return response.data;
    } catch (error) {
      logger.error({ error }, 'PesaPal submit order failed');
      throw error;
    }
  }

  public async getTransactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
    await this.authenticate();

    try {
      const response = await this.axiosInstance.get(`/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`);
      return response.data;
    } catch (error) {
      logger.error({ error }, 'PesaPal get transaction status failed');
      throw error;
    }
  }

  public async registerIPN(url: string, ipnNotificationType: string = 'GET'): Promise<{ ipn_id: string; url: string; created_date: string; error: any; status: string }> {
    await this.authenticate();

    try {
      const response = await this.axiosInstance.post('/api/URLSetup/RegisterIPN', {
        url,
        ipn_notification_type: ipnNotificationType
      });
      return response.data;
    } catch (error) {
      logger.error({ error }, 'PesaPal register IPN failed');
      throw error;
    }
  }
}
