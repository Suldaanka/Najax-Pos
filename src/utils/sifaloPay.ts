import axios from 'axios';

export interface SifaloPayRequest {
  account: string; // Customer phone number
  gateway: 'waafi' | 'edahab' | 'pbwallet';
  amount: string;
  currency: 'USD' | 'SLSH';
  order_id?: string;
}

export interface SifaloPayResponse {
  code: string;
  sid: string;
  response: string;
}

export interface SifaloPayVerifyResponse {
  sid: string;
  account: string;
  payment_type: string;
  amount: string;
  status: 'success' | 'failure' | 'pending';
  code: number;
}

export class SifaloPay {
  private static getAuth() {
    const username = process.env.SIFALOPAY_USERNAME;
    const password = process.env.SIFALOPAY_PASSWORD;
    if (!username || !password) {
      throw new Error('SifaloPay credentials not configured');
    }
    return Buffer.from(`${username}:${password}`).toString('base64');
  }

  static async initiatePayment(data: SifaloPayRequest): Promise<SifaloPayResponse> {
    const url = process.env.SIFALOPAY_API_URL || 'https://api.sifalopay.com/gateway/';
    const response = await axios.post<SifaloPayResponse>(url, data, {
      headers: {
        'Authorization': `Basic ${this.getAuth()}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('SifaloPay Initiation Response:', response.data);
    return response.data;
  }

  static async verifyPayment(sid: string): Promise<SifaloPayVerifyResponse> {
    const baseUrl = (process.env.SIFALOPAY_API_URL || 'https://api.sifalopay.com/gateway/').replace(/\/$/, '');
    const url = `${baseUrl}/verify.php`;
    
    const response = await axios.post<SifaloPayVerifyResponse>(url, { sid }, {
      headers: {
        'Authorization': `Basic ${this.getAuth()}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('SifaloPay Verification Response:', response.data);
    return response.data;
  }
}
