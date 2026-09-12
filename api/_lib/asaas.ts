/**
 * Cliente mínimo da API do Asaas (v3). Uma instância por escola, com a chave
 * da conta DA ESCOLA — a plataforma nunca movimenta dinheiro.
 *
 * Docs: https://docs.asaas.com/reference
 */

export type AsaasEnv = 'sandbox' | 'production';

const BASE: Record<AsaasEnv, string> = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

export interface AsaasCustomer { id: string; name: string; cpfCnpj?: string; email?: string }

export interface AsaasPayment {
  id: string;
  customer: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS' | string;
  billingType: 'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD' | string;
  value: number;
  netValue?: number;
  dueDate: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  description?: string | null;
  deleted?: boolean;
}

export class AsaasError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export class Asaas {
  private base: string;
  constructor(private apiKey: string, env: AsaasEnv) {
    this.base = BASE[env];
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', accept: 'application/json', access_token: this.apiKey, 'User-Agent': 'AlthionEducation/1.0' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* não-JSON */ }
    if (!res.ok) {
      const errs = (json as { errors?: { description?: string }[] } | null)?.errors;
      const msg = errs?.map(e => e.description).filter(Boolean).join('; ') || `Asaas respondeu ${res.status}`;
      throw new AsaasError(res.status, msg);
    }
    return json as T;
  }

  /** Valida a chave: qualquer chamada autenticada serve. */
  async ping(): Promise<{ ok: true }> {
    await this.call('GET', '/customers?limit=1');
    return { ok: true };
  }

  async findCustomerByCpf(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const r = await this.call<{ data: AsaasCustomer[] }>('GET', `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`);
    return r.data?.[0] ?? null;
  }

  async createCustomer(input: { name: string; cpfCnpj: string; email?: string; mobilePhone?: string; externalReference?: string }): Promise<AsaasCustomer> {
    return this.call<AsaasCustomer>('POST', '/customers', { ...input, notificationDisabled: false });
  }

  async createPayment(input: {
    customer: string;
    billingType: 'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    discount?: { value: number; dueDateLimitDays: number; type: 'FIXED' | 'PERCENTAGE' };
    fine?: { value: number; type: 'FIXED' | 'PERCENTAGE' };
    interest?: { value: number };
  }): Promise<AsaasPayment> {
    return this.call<AsaasPayment>('POST', '/payments', input);
  }

  getPayment(id: string): Promise<AsaasPayment> {
    return this.call<AsaasPayment>('GET', `/payments/${id}`);
  }

  async deletePayment(id: string): Promise<void> {
    await this.call('DELETE', `/payments/${id}`);
  }

  /** QR Code PIX (payload copia-e-cola + imagem base64). Só existe para cobranças PIX ou UNDEFINED. */
  async pixQrCode(id: string): Promise<{ encodedImage: string; payload: string } | null> {
    try {
      return await this.call<{ encodedImage: string; payload: string }>('GET', `/payments/${id}/pixQrCode`);
    } catch (e) {
      if (e instanceof AsaasError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }
  }
}

/** Status do Asaas -> status da nossa fatura. */
export function mapStatus(s: string): 'pending' | 'paid' | 'overdue' | 'refunded' | 'canceled' {
  switch (s) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
    case 'DUNNING_RECEIVED':
      return 'paid';
    case 'OVERDUE':
    case 'DUNNING_REQUESTED':
      return 'overdue';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'refunded';
    default:
      return 'pending';
  }
}

export function toCents(v: number): number { return Math.round(v * 100); }
export function fromCents(c: number): number { return Math.round(c) / 100; }
