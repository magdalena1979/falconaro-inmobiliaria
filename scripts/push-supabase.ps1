$ErrorActionPreference = 'Stop'

$securePassword = Read-Host 'Contraseña de PostgreSQL de Supabase' -AsSecureString
$plainPassword = [Net.NetworkCredential]::new('', $securePassword).Password

if ([string]::IsNullOrWhiteSpace($plainPassword)) {
  throw 'La contraseña de PostgreSQL no puede estar vacía.'
}

try {
  $env:SUPABASE_DB_PASSWORD = $plainPassword
  & npx.cmd supabase db push
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI finalizó con código $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
  $plainPassword = $null
  $securePassword = $null
}
