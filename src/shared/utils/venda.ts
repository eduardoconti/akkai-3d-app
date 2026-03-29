import type { MeioPagamento, TipoVenda } from '../types/domain';

export function getTipoVendaLabel(tipo: TipoVenda): string {
  switch (tipo) {
    case 'FEIRA':
      return 'Feira';
    case 'LOJA':
      return 'Loja';
    case 'ONLINE':
      return 'Online';
  }
}

export function getMeioPagamentoLabel(meioPagamento: MeioPagamento): string {
  switch (meioPagamento) {
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
