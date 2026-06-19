import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { sendPasswordReset } from '../services/auth'

interface ProfilePageProps {
  email?: string
  role?: string
}

export function ProfilePage({ email, role }: ProfilePageProps) {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Cuenta</Typography>
          <Typography variant="h4">Mi perfil</Typography>
          <Typography variant="body2" color="text.secondary">
            Datos de acceso y rol activo dentro de la plataforma.
          </Typography>
        </Box>
      </Box>

      <Card className="profile-card" variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Box className="profile-summary">
              <Avatar className="profile-avatar">{email ? avatarInitial(email) : 'U'}</Avatar>
              <Box>
                <Typography variant="h6">{email ?? 'Sin email'}</Typography>
                <Typography className="role-pill" variant="caption">
                  {roleLabel(role)}
                </Typography>
              </Box>
            </Box>

            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="subtitle2">Seguridad</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Recibi un enlace en tu correo para cambiar o recuperar tu contrasena.
              </Typography>
              <Button disabled={!email || isSending} onClick={sendReset} variant="contained">
                {isSending ? <CircularProgress color="inherit" size={20} /> : 'Enviar enlace de contrasena'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )

  async function sendReset() {
    if (!email) return
    setError(null)
    setMessage(null)
    setIsSending(true)

    try {
      await sendPasswordReset(email)
      setMessage('Te enviamos el enlace para actualizar la contrasena.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setIsSending(false)
    }
  }
}

function avatarInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || 'U'
}

function roleLabel(role: string | undefined): string {
  if (role === 'superadmin') return 'Super administrador'
  if (role === 'admin') return 'Administrador'
  return 'Sin acceso al panel'
}
