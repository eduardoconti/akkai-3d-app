import { Collapse, MenuItem, Paper, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  DatePickerField,
  getFieldMessage,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';
import type { SaleFormErrors } from '@/features/sales/types/sale-form';

interface SaleConfigSectionProps {
  dataVenda: string;
  errors: SaleFormErrors;
  fairs: Feira[];
  idFeira: number | '';
  open: boolean;
  problem: ProblemDetails | null;
  tipo: TipoVenda;
  onChangeDate: (dataVenda: string) => void;
  onChangeFair: (idFeira: number | '') => void;
  onChangeSaleType: (tipo: TipoVenda) => void;
}

export default function SaleConfigSection({
  dataVenda,
  errors,
  fairs,
  idFeira,
  open,
  problem,
  tipo,
  onChangeDate,
  onChangeFair,
  onChangeSaleType,
}: SaleConfigSectionProps) {
  return (
    <Collapse in={open} unmountOnExit>
      <Paper
        elevation={2}
        sx={{
          borderRadius: 2,
          p: 1.5,
        }}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <DatePickerField
              label="Data da venda"
              value={dataVenda}
              onValueChange={onChangeDate}
              slotProps={{
                textField: {
                  size: 'small',
                  required: true,
                  error: Boolean(
                    errors.dataVenda || getFieldMessage(problem, 'dataVenda'),
                  ),
                  helperText:
                    errors.dataVenda ?? getFieldMessage(problem, 'dataVenda'),
                },
              }}
            />
          </Grid>

          <Grid
            size={{
              xs: tipo === 'FEIRA' ? 6 : 12,
              sm: tipo === 'FEIRA' ? 3 : 7,
            }}
          >
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo"
              required
              value={tipo}
              onChange={(event) =>
                onChangeSaleType(event.target.value as TipoVenda)
              }
            >
              <MenuItem value="FEIRA">Feira</MenuItem>
              <MenuItem value="LOJA">Loja</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
              <MenuItem value="CONSIGNACAO" disabled>
                Consignação
              </MenuItem>
            </TextField>
          </Grid>

          {tipo === 'FEIRA' ? (
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Feira"
                required
                value={idFeira}
                onChange={(event) => {
                  onChangeFair(
                    event.target.value === '' ? '' : Number(event.target.value),
                  );
                }}
                error={Boolean(
                  errors.idFeira || getFieldMessage(problem, 'idFeira'),
                )}
                helperText={
                  errors.idFeira ?? getFieldMessage(problem, 'idFeira')
                }
              >
                <MenuItem value="">Selecione uma feira</MenuItem>
                {fairs.map((feira) => (
                  <MenuItem key={feira.id} value={feira.id}>
                    {feira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}
        </Grid>
      </Paper>
    </Collapse>
  );
}
