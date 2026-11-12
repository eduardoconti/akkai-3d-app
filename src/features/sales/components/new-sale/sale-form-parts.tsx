import { Button, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        mb: 1.25,
        color: 'text.secondary',
        fontWeight: 800,
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </Typography>
  );
}

export function WalletToggleGroup({
  error,
  onChange,
  value,
  wallets,
}: {
  error?: string;
  onChange: (idCarteira: number) => void;
  value: number | '';
  wallets: Array<{ id: number; nome: string; ativa: boolean }>;
}) {
  const activeWallets = wallets.filter((wallet) => wallet.ativa);

  return (
    <Stack spacing={0.75}>
      <Grid container spacing={1}>
        {activeWallets.map((wallet) => {
          const isSelected = wallet.id === value;

          return (
            <Grid
              key={wallet.id}
              size={{
                xs:
                  activeWallets.length === 1
                    ? 12
                    : activeWallets.length >= 3
                      ? 4
                      : 6,
                sm:
                  activeWallets.length === 1
                    ? 12
                    : activeWallets.length >= 3
                      ? 4
                      : 6,
              }}
            >
              <Button
                fullWidth
                variant={isSelected ? 'contained' : 'outlined'}
                color={isSelected ? 'primary' : 'inherit'}
                onClick={() => onChange(wallet.id)}
                sx={{
                  minHeight: 44,
                  justifyContent: 'center',
                  textTransform: 'none',
                  px: 1,
                }}
              >
                {wallet.nome}
              </Button>
            </Grid>
          );
        })}
      </Grid>

      {error ? (
        <Typography variant="caption" color="error" data-form-error>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
