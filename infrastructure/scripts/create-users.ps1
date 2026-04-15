param (
    [Parameter(Mandatory=$true)]
    [string]$UserPoolId
)

$users = @("danielibabet", "dibanezb")
$password = "Cee666"

foreach ($user in $users) {
    Write-Host "Creando usuario: $user"
    aws cognito-idp admin-create-user `
        --user-pool-id $UserPoolId `
        --username $user `
        --message-action SUPPRESS `
        --region eu-west-1

    Write-Host "Configurando contraseña permanente para: $user"
    aws cognito-idp admin-set-user-password `
        --user-pool-id $UserPoolId `
        --username $user `
        --password $password `
        --permanent `
        --region eu-west-1
}

Write-Host "¡Usuarios creados con éxito!"
