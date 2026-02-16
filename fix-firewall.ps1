# TargetUp: Storage Agent Firewall Repair
# Run this script as Administrator on the Storage Agent server (.56)

$PORT = 3002
$RULE_NAME = "TargetUp Storage Agent (TCP-In)"

Write-Host "🛡️  Checking Firewall Configuration for Port $PORT..." -ForegroundColor Cyan

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName $RULE_NAME -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Rule '$RULE_NAME' already exists. Re-applying to ensure correctness..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $RULE_NAME
}

# Add new rule
try {
    New-NetFirewallRule -DisplayName $RULE_NAME `
        -Direction Inbound `
        -LocalPort $PORT `
        -Protocol TCP `
        -Action Allow `
        -Description "Allow inbound traffic for TargetUp Storage Agent" `
        -Group "TargetUp"
    
    Write-Host "✅ SUCCESS! Port $PORT is now open for inbound traffic." -ForegroundColor Green
    Write-Host "You can now verify connectivity from the Main API server." -ForegroundColor White
}
catch {
    Write-Host "❌ FAILED: Could not create firewall rule. Please ensure you are running as Administrator." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
