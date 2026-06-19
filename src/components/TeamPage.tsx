import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useState } from 'react'
import { inviteTeamMember } from '../services/auth'
import type { UserRole } from '../services/auth'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'
import { useTableMutations, useTableRows } from '../hooks/useTableRows'
import { formatValue } from '../utils/format'
import { EmptyState } from './EmptyState'

interface TeamPageProps {
  module: ModuleDefinition
  currentUserRole?: string
}

const roleOptions: Array<{ value: UserRole; label: string; helper: string }> = [
  { value: 'superadmin', label: 'Super administrador', helper: 'Gestiona usuarios, roles y toda la operacion.' },
  { value: 'admin', label: 'Administrador', helper: 'Opera el sistema y consulta informacion de gestion.' },
  { value: 'user', label: 'Bloqueado', helper: 'Sin acceso al panel administrativo.' },
]

export function TeamPage({ module, currentUserRole }: TeamPageProps) {
  const table = module.table
  const rowsQuery = useTableRows(table)
  const mutations = useTableMutations(table)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('admin')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canManageRoles = currentUserRole === 'superadmin'

  const columns: GridColDef[] = [
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 240,
      valueFormatter: (value) => formatValue(value),
    },
    {
      field: 'role',
      headerName: 'Rol',
      flex: 0.8,
      minWidth: 220,
      renderCell: (params) => (
        <TextField
          disabled={!canManageRoles || mutations.isPending}
          onChange={(event) => updateRole(params.row, event.target.value as UserRole)}
          select
          size="small"
          value={String(params.row.role ?? 'user')}
          sx={{ minWidth: 190 }}
        >
          {roleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      field: 'id',
      headerName: 'ID',
      flex: 1,
      minWidth: 240,
      valueFormatter: (value) => formatValue(value),
    },
    {
      field: '__actions',
      headerName: 'Acciones',
      sortable: false,
      filterable: false,
      width: 190,
      renderCell: (params) => {
        const isBlocked = params.row.role === 'user'
        return (
          <Button
            color={isBlocked ? 'primary' : 'error'}
            disabled={!canManageRoles || mutations.isPending}
            onClick={() => updateRole(params.row, isBlocked ? 'admin' : 'user')}
            size="small"
            variant="outlined"
          >
            {isBlocked ? 'Reactivar' : 'Bloquear'}
          </Button>
        )
      },
    },
  ]

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">{table.name}</Typography>
          <Typography variant="h4">Equipo</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion de usuarios, invitaciones y roles de acceso.
          </Typography>
        </Box>
      </Box>

      <Card variant="outlined" className="team-invite-card">
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography component="h2" variant="subtitle2">
                Invitar usuario
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Envia un enlace de acceso y deja preparado el rol para el perfil.
              </Typography>
            </Box>

            {!canManageRoles && (
              <Alert severity="warning">
                Solo un super administrador puede cambiar roles o invitar usuarios con rol asignado.
              </Alert>
            )}
            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <Box className="team-invite-form">
              <TextField
                disabled={!canManageRoles || isInviting}
                label="Email"
                onChange={(event) => setInviteEmail(event.target.value)}
                type="email"
                value={inviteEmail}
              />
              <TextField
                disabled={!canManageRoles || isInviting}
                label="Rol"
                onChange={(event) => setInviteRole(event.target.value as UserRole)}
                select
                value={inviteRole}
              >
                {roleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button disabled={!canManageRoles || isInviting || !inviteEmail.trim()} onClick={sendInvite} variant="contained">
                {isInviting ? <CircularProgress color="inherit" size={20} /> : 'Enviar invitacion'}
              </Button>
            </Box>

            <Box className="role-help-grid">
              {roleOptions.map((option) => (
                <Box key={option.value} className="role-help-item">
                  <Typography variant="subtitle2">{option.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.helper}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {rowsQuery.isLoading ? (
        <Box className="centered">
          <CircularProgress size={28} />
        </Box>
      ) : rowsQuery.isError ? (
        <EmptyState
          title="No se pudo cargar el equipo"
          description={rowsQuery.error.message}
          severity="error"
        />
      ) : (
        <Card variant="outlined" className="data-panel">
          <DataGrid
            autoHeight
            columns={columns}
            disableRowSelectionOnClick
            getRowId={(row) => String(row.id)}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            rows={rowsQuery.data ?? []}
          />
        </Card>
      )}

      {mutations.update.error && (
        <EmptyState
          title="No se pudo actualizar el rol"
          description={mutations.update.error.message}
          severity="error"
        />
      )}
    </Stack>
  )

  function updateRole(row: TableRow, role: UserRole) {
    if (!canManageRoles || row.role === role) return
    mutations.update.mutate({ ...row, role })
  }

  async function sendInvite() {
    setError(null)
    setMessage(null)
    setIsInviting(true)

    try {
      const result = await inviteTeamMember(inviteEmail.trim(), inviteRole)
      setInviteEmail('')
      setMessage(
        result.roleAssigned
          ? 'Invitacion enviada y rol asignado correctamente.'
          : 'Invitacion enviada. Cuando el usuario acepte el enlace, revisa el equipo para confirmar el rol.',
      )
      await rowsQuery.refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la invitacion.')
    } finally {
      setIsInviting(false)
    }
  }
}
