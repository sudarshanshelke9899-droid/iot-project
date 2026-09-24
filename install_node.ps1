$ErrorActionPreference = 'Stop'
$nodeVer = 'v20.18.0'
$destDir = "$env:LOCALAPPDATA\Programs\nodejs"
$zipPath = "$env:TEMP\node.zip"
$extractDir = "$env:TEMP\node-extract"

Write-Host "Downloading Node.js $nodeVer from nodejs.org..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://nodejs.org/dist/$nodeVer/node-$nodeVer-win-x64.zip" -OutFile $zipPath

Write-Host "Extracting to $destDir..."
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }
Copy-Item -Path "$extractDir\node-$nodeVer-win-x64\*" -Destination $destDir -Recurse -Force

# Clean up temporary zip and extraction folder
Remove-Item $zipPath -Force
Remove-Item $extractDir -Recurse -Force

# Update User PATH if not already present
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$destDir*") {
    [Environment]::SetEnvironmentVariable('Path', "$userPath;$destDir", 'User')
}

Write-Host "Node.js successfully installed at: $destDir"
