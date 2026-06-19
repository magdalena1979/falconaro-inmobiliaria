import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import type { DashboardSeries } from '../hooks/useDashboardMetrics'
import type { ModuleDefinition } from '../services/supabase/types'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

interface DashboardProps {
  modules: ModuleDefinition[]
}

const chartColors = {
  red: '#C72028',
  redDark: '#8f151b',
  gray: '#7F7F7F',
  grayDark: '#2C2C2C',
  grayLight: '#D1D5DB',
  green: '#2E7D5B',
  amber: '#B7791F',
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  cutout: '68%',
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        usePointStyle: true,
      },
    },
  },
}

const barOptions: ChartOptions<'bar'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}

const currencyLineOptions: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => formatCompactCurrency(Number(value)),
      },
    },
  },
}

const indexLineOptions: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${Number(context.parsed.y ?? 0).toFixed(1)}`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: false,
      ticks: {
        callback: (value) => Number(value).toFixed(0),
      },
    },
  },
}

export function Dashboard({ modules }: DashboardProps) {
  const metrics = useDashboardMetrics(modules)
  const dashboard = metrics.data

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Operacion</Typography>
          <Typography variant="h4">Dashboard</Typography>
        </Box>
      </Box>

      {metrics.isLoading ? (
        <Box className="centered">
          <CircularProgress size={28} />
        </Box>
      ) : metrics.isError ? (
        <Alert severity="error">No se pudieron cargar los indicadores del dashboard.</Alert>
      ) : dashboard ? (
        <>
          <Box className="metric-grid">
            {dashboard.metrics.map((metric) => (
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

          <Box className="dashboard-chart-grid">
            <ChartPanel title="Ocupacion de propiedades" helper={dashboard.propertyAvailability.helper}>
              <Doughnut
                data={toDoughnutData(dashboard.propertyAvailability, [
                  chartColors.green,
                  chartColors.red,
                  chartColors.grayLight,
                  chartColors.gray,
                ])}
                options={doughnutOptions}
              />
            </ChartPanel>

            <ChartPanel title="Contratos por estado" helper={dashboard.contractStatus.helper}>
              <Bar
                data={toBarData(dashboard.contractStatus, 'Contratos', [
                  chartColors.red,
                  chartColors.redDark,
                  chartColors.grayDark,
                  chartColors.gray,
                  chartColors.amber,
                  chartColors.green,
                ])}
                options={barOptions}
              />
            </ChartPanel>

            <ChartPanel
              className="dashboard-chart-wide"
              title="Cobros de los ultimos 6 meses"
              helper={dashboard.paymentTimeline.helper}
            >
              <Line data={toLineData(dashboard.paymentTimeline, 'Cobros', chartColors.red)} options={currencyLineOptions} />
            </ChartPanel>

            <ChartPanel
              className="dashboard-chart-wide"
              title="Cobros del ano"
              helper={dashboard.annualPaymentTimeline.helper}
            >
              <Line
                data={toLineData(dashboard.annualPaymentTimeline, 'Cobros anuales', chartColors.green)}
                options={currencyLineOptions}
              />
            </ChartPanel>

            <ChartPanel title="Alertas por urgencia" helper={dashboard.alertUrgency.helper}>
              <Bar
                data={toBarData(dashboard.alertUrgency, 'Alertas', [
                  chartColors.redDark,
                  chartColors.red,
                  chartColors.amber,
                  chartColors.gray,
                ])}
                options={barOptions}
              />
            </ChartPanel>

            <ChartPanel
              className="dashboard-chart-wide"
              title="Ajustes automaticos de alquiler (ICL)"
              helper={dashboard.rentalAdjustmentIndex.helper}
            >
              <Line
                data={toLineData(dashboard.rentalAdjustmentIndex, 'ICL mock', chartColors.amber)}
                options={indexLineOptions}
              />
            </ChartPanel>
          </Box>
        </>
      ) : null}
    </Stack>
  )
}

interface ChartPanelProps {
  title: string
  helper: string
  className?: string
  children: React.ReactNode
}

function ChartPanel({ title, helper, className, children }: ChartPanelProps) {
  return (
    <Card className={`dashboard-chart-card ${className ?? ''}`.trim()} variant="outlined">
      <CardContent>
        <Box className="dashboard-chart-heading">
          <Typography component="h2" variant="subtitle2">
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        </Box>
        <Box className="dashboard-chart-body">{children}</Box>
      </CardContent>
    </Card>
  )
}

function toDoughnutData(series: DashboardSeries, colors: string[]): ChartData<'doughnut', number[], string> {
  return {
    labels: emptyAwareLabels(series.labels),
    datasets: [
      {
        data: emptyAwareValues(series.values),
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }
}

function toBarData(series: DashboardSeries, label: string, colors: string[]): ChartData<'bar', number[], string> {
  return {
    labels: emptyAwareLabels(series.labels),
    datasets: [
      {
        label,
        data: emptyAwareValues(series.values),
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 44,
      },
    ],
  }
}

function toLineData(series: DashboardSeries, label: string, color: string): ChartData<'line', number[], string> {
  return {
    labels: emptyAwareLabels(series.labels),
    datasets: [
      {
        label,
        data: emptyAwareValues(series.values),
        borderColor: color,
        backgroundColor: transparentize(color),
        fill: true,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.35,
      },
    ],
  }
}

function transparentize(hex: string): string {
  const normalized = hex.replace('#', '')
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, 0.12)`
}

function emptyAwareLabels(labels: string[]): string[] {
  return labels.length ? labels : ['Sin datos']
}

function emptyAwareValues(values: number[]): number[] {
  return values.length ? values : [0]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    compactDisplay: 'short',
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
    currency: 'ARS',
  }).format(value)
}
