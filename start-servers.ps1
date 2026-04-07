# Kill any existing node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# Start backend
$backend = Start-Process -PassThru -NoNewWindow -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\Users\NOSA\Desktop\nosa_web_projects\full_inventory_website\backend"
Write-Host "✓ Backend started (PID: $($backend.Id))"
Start-Sleep -Seconds 3

# Start frontend
$frontend = Start-Process -PassThru -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "c:\Users\NOSA\Desktop\nosa_web_projects\full_inventory_website\frontend"
Write-Host "✓ Frontend started (PID: $($frontend.Id))"
Write-Host "Ready! Open browser to http://localhost:3000"
