$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $extraPaths = @(
        "$env:ProgramFiles\nodejs",
        "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
    )
    $env:Path = (@($machinePath, $userPath) + $extraPaths | Where-Object { $_ }) -join ";"
}

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage {
    param(
        [string]$Id,
        [string]$DisplayName
    )

    Write-Step "Installing $DisplayName"
    & winget install --id $Id --exact --source winget `
        --accept-package-agreements --accept-source-agreements `
        --silent --disable-interactivity

    if ($LASTEXITCODE -ne 0) {
        throw "$DisplayName installation failed (winget exit code $LASTEXITCODE)."
    }

    Refresh-ProcessPath
}

try {
    Write-Host "KNUT Thesis Studio - First-time setup" -ForegroundColor Green
    Write-Host "This window installs the required local components."

    if (-not (Test-Command "winget.exe")) {
        throw "Windows Package Manager (winget) is unavailable. Install or update 'App Installer' from Microsoft Store, then run this setup again."
    }

    Refresh-ProcessPath

    if (Test-Command "node.exe") {
        Write-Host "[OK] Node.js is already installed."
    }
    else {
        Install-WingetPackage -Id "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS"
    }

    if (Test-Command "xelatex.exe") {
        Write-Host "[OK] MiKTeX is already installed."
    }
    else {
        Install-WingetPackage -Id "MiKTeX.MiKTeX" -DisplayName "MiKTeX"
    }

    Refresh-ProcessPath

    if (-not (Test-Command "node.exe")) {
        throw "Node.js was installed but node.exe is not available yet. Restart Windows and launch the editor again."
    }

    if (-not (Test-Command "xelatex.exe")) {
        throw "MiKTeX was installed but xelatex.exe is not available yet. Restart Windows and launch the editor again."
    }

    Write-Step "Setup completed"
    Write-Host "The local editor will open automatically." -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}
catch {
    Write-Host ""
    Write-Host "Setup could not be completed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}
