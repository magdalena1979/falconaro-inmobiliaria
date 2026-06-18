import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import type { ModuleDefinition } from '../services/supabase/types'

interface DashboardProps {
  modules: ModuleDefinition[]
}

export function Dashboard({ modules }: DashboardProps) {
  const metrics = useDashboardMetrics(modules)

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Operacion</Typography>
          <Typography variant="h4">Dashboard</Typography>
        </Box>
        <Chip label={`${modules.length} tablas configuradas`} />
      </Box>

      {metrics.isLoading ? (
        <Box className="centered">
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box className="metric-grid">
          {(metrics.data ?? []).map((metric) => (
            <Card key={metric.label} className="metric-card" variant="outlined">
              <CardContent>
                <Typography component="h2" variant="subtitle2" gutterBottom>
                  {metric.label}
                </Typography>
                <Typography variant="h3" component="p">
                  {metric.value ?? '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metric.helper}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

    </Stack>
  )
}
