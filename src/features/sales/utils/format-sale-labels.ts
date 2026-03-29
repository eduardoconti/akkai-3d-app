import type { MeioPagamento, TipoVenda } from '@/shared/lib/types/domain';

export function getSaleTypeLabel(type: TipoVenda): string {
  switch (type) {
    case 'FEIRA':
      return 'Feira';
    case 'LOJA':
      return 'Loja';
    case 'ONLINE':
      return 'Online';
  }
}

export function getPaymentMethodLabel(paymentMethod: MeioPagamento): string {
  switch (paymentMethod) {
    case 'DIN':
      return 'Dinheiro';
    case 'DEB':
      return 'Cartão débito';
    case 'CRE':
      return 'Cartão crédito';
    case 'PIX':
      return 'Pix';
  }
}
