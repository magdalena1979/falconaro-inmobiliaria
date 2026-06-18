import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { sendPasswordReset, signIn, updatePassword } from '../services/auth'

interface AuthPageProps {
  mode: 'login' | 'recovery'
  onPasswordUpdated?: () => void
}

export function AuthPage({ mode, onPasswordUpdated }: AuthPageProps) {
  const [email, setEmail] = useState('magdalenabelaustegui@gmail.com')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRecovery = mode === 'recovery'

  return (
    <Box className="auth-shell">
      <Paper className="auth-card" variant="outlined">
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline">Falconaro</Typography>
            <Typography variant="h4">
              {isRecovery ? 'Actualizar contrasena' : view === 'forgot' ? 'Recuperar acceso' : 'Ingresar'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRecovery ? 'Defini una nueva contrasena para tu cuenta.' : 'Acceso protegido al sistema inmobiliario.'}
            </Typography>
          </Box>

          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          {isRecovery ? (
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                label="Nueva contrasena"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
              <Button disabled={isPending} onClick={handleUpdatePassword} size="large" variant="contained">
                {isPending ? <CircularProgress color="inherit" size={20} /> : 'Guardar contrasena'}
              </Button>
            </Stack>
          ) : view === 'forgot' ? (
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              <Button disabled={isPending} onClick={handlePasswordReset} size="large" variant="contained">
                {isPending ? <CircularProgress color="inherit" size={20} /> : 'Enviar enlace'}
              </Button>
              <Button onClick={() => setView('login')}>Volver al login</Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              <TextField
                fullWidth
                label="Contrasena"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <Button disabled={isPending} onClick={handleLogin} size="large" variant="contained">
                {isPending ? <CircularProgress color="inherit" size={20} /> : 'Ingresar'}
              </Button>
              <Button onClick={() => setView('forgot')}>Olvide mi contrasena</Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  )

  async function handleLogin() {
    setError(null)
    setMessage(null)
    setIsPending(true)

    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.')
    } finally {
      setIsPending(false)
    }
  }

  async function handlePasswordReset() {
    setError(null)
    setMessage(null)
    setIsPending(true)

    try {
      await sendPasswordReset(email)
      setMessage('Te enviamos un enlace para recuperar la contrasena.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setIsPending(false)
    }
  }

  async function handleUpdatePassword() {
    setError(null)
    setMessage(null)

    if (newPassword.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.')
      return
    }

    setIsPending(true)

    try {
      await updatePassword(newPassword)
      setMessage('Contrasena actualizada correctamente.')
      window.history.replaceState({}, '', window.location.origin)
      onPasswordUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contrasena.')
    } finally {
      setIsPending(false)
    }
  }
}
