import { httpClient } from '@/shared/lib/api/http-client';
import type { ListaAlertas } from '@/shared/lib/types/domain';

export function listAlerts(): Promise<ListaAlertas> {
  return httpClient.get<ListaAlertas>('/notificacao/alertas');
}
