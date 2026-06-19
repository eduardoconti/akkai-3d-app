import { formatCurrencyWithVisibility } from '@/shared/utils/format-currency';
import { useValueVisibilityStore } from '@/shared/lib/stores/use-value-visibility-store';

interface CurrencyValueProps {
  value: number;
}

export default function CurrencyValue({ value }: CurrencyValueProps) {
  const hideValues = useValueVisibilityStore((state) => state.hideValues);

  return <>{formatCurrencyWithVisibility(value, hideValues)}</>;
}
