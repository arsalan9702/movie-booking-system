# Start all three nodes in separate windows
$nodes = @(
    @{Id = "node-1"; Port = "4000"},
    @{Id = "node-2"; Port = "4001"},
    @{Id = "node-3"; Port = "4002"}
)

foreach ($node in $nodes) {
    Start-Process PowerShell -ArgumentList @"
        -NoExit -Command "cd '$PWD\backend'; `$env:NODE_ID='$($node.Id)'; `$env:PORT='$($node.Port)'; npm run dev"
"@
    Start-Sleep -Seconds 2
}

Write-Host "✅ Cluster started successfully!" -ForegroundColor Green
Write-Host "Nodes running on:" -ForegroundColor Yellow
Write-Host "  - Node 1: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  - Node 2: http://localhost:4001" -ForegroundColor Cyan
Write-Host "  - Node 3: http://localhost:4002" -ForegroundColor Cyan