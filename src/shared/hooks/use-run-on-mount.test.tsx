import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRunOnMount } from './use-run-on-mount';

describe('useRunOnMount', () => {
  it('executa a ação uma única vez, mesmo com novas renderizações', () => {
    const acao = vi.fn();
    const { rerender } = renderHook(({ fn }) => useRunOnMount(fn), {
      initialProps: { fn: acao },
    });

    rerender({ fn: vi.fn() });
    rerender({ fn: vi.fn() });

    expect(acao).toHaveBeenCalledTimes(1);
  });
});
