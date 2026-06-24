import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTableRows } from '../hooks/useTableRows'
import { supabase } from '../services/supabase/client'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'
import { EntityPage } from './EntityPage'

interface PropertiesPageProps {
  module: ModuleDefinition
  ownersModule: ModuleDefinition
}

export function PropertiesPage({ module, ownersModule }: PropertiesPageProps) {
  const [property, setProperty] = useState<TableRow>()
  const [ownerIds, setOwnerIds] = useState<string[]>([])
  const ownersQuery = useTableRows(ownersModule.table)
  const queryClient = useQueryClient()
  const updateOwners = useMutation({
    mutationFn: async () => {
      if (!property?.id || !ownerIds.length) {
        throw new Error('Seleccioná al menos un propietario.')
      }
      const { error } = await supabase
        .from('propiedades')
        .update({
          propietario_id: ownerIds[0],
          titulares_ids: ownerIds,
        })
        .eq('id', String(property.id))
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['table-rows', 'propiedades'] })
      setProperty(undefined)
    },
  })

  const owners = ownersQuery.data ?? []

  return (
    <>
      <EntityPage
        module={module}
        renderRowActions={(row) => (
          <Button size="small" onClick={() => openOwners(row)}>
            Propietarios
          </Button>
        )}
      />
      <Dialog open={Boolean(property)} onClose={() => setProperty(undefined)} fullWidth maxWidth="sm">
        <DialogTitle>Propietarios del inmueble</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {String(property?.direccion ?? 'Inmueble seleccionado')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="property-owner-label">Propietarios</InputLabel>
              <Select
                labelId="property-owner-label"
                label="Propietarios"
                multiple
                value={ownerIds}
                renderValue={(selected) =>
                  owners
                    .filter((owner) => selected.includes(String(owner.id)))
                    .map(personLabel)
                    .join(' / ')
                }
                onChange={(event) =>
                  setOwnerIds(
                    typeof event.target.value === 'string'
                      ? event.target.value.split(',')
                      : event.target.value,
                  )
                }
              >
                {owners.map((owner) => {
                  const id = String(owner.id)
                  return (
                    <MenuItem key={id} value={id}>
                      <Checkbox checked={ownerIds.includes(id)} />
                      <ListItemText primary={personLabel(owner)} />
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
            {updateOwners.error && <Alert severity="error">{updateOwners.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProperty(undefined)}>Cancelar</Button>
          <Button
            disabled={updateOwners.isPending || !ownerIds.length}
            variant="contained"
            onClick={() => updateOwners.mutate()}
          >
            Guardar propietarios
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )

  function openOwners(row: TableRow) {
    setProperty(row)
    setOwnerIds(ownerIdsForProperty(row))
  }
}

function personLabel(row: TableRow): string {
  return [row.apellidos, row.nombres].filter(Boolean).join(', ') || String(row.id)
}

function ownerIdsForProperty(row: TableRow): string[] {
  if (Array.isArray(row.titulares_ids)) return row.titulares_ids.map(String)
  if (typeof row.titulares_ids === 'string') {
    try {
      const parsed = JSON.parse(row.titulares_ids)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // Legacy records can still use propietario_id.
    }
  }
  return row.propietario_id ? [String(row.propietario_id)] : []
}
