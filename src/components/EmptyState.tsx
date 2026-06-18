import { Alert, Box, Button, Typography } from '@mui/material'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  severity?: 'info' | 'warning' | 'error'
}

export function EmptyState({ title, description, actionLabel, onAction, severity = 'info' }: EmptyStateProps) {
  return (
    <Alert
      severity={severity}
      action={
        actionLabel ? (
          <Button color="inherit" size="small" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
      sx={{ alignItems: 'center', borderRadius: 2 }}
    >
      <Box>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2">{description}</Typography>
      </Box>
    </Alert>
  )
}
