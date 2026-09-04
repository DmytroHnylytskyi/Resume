param (
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("aetheria", "terrascope", "forma", "lumina", "all")]
    [string]$Target
)

function Deploy-Subtree ($name, $prefix, $remote) {
    Write-Host "`n>> Deploying $name ($prefix) to $remote..." -ForegroundColor Cyan
    $tempBranch = "deploy-tmp-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
    
    try {
        Write-Host ">> Splitting subtree for $prefix..." -ForegroundColor DarkGray
        git subtree split --prefix $prefix -b $tempBranch
        
        Write-Host ">> Pushing to Heroku ($remote)..." -ForegroundColor Yellow
        git -c credential.helper= push $remote "${tempBranch}:main" --force
        
        Write-Host "OK: Successfully deployed $name to Heroku!" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Error deploying $name : $_" -ForegroundColor Red
    }
    finally {
        git branch -D $tempBranch 2>$null
    }
}

switch ($Target) {
    "aetheria" {
        Deploy-Subtree "Aetheria (Hub)" "Aetheria" "heroku"
    }
    "terrascope" {
        Deploy-Subtree "TerraScope" "TerraScope/frontend" "heroku-terrascope"
    }
    "forma" {
        Deploy-Subtree "Forma-3D" "Forma-3D/frontend" "heroku-forma"
    }
    "lumina" {
        Deploy-Subtree "Lumina" "Lumina/frontend" "heroku-lumina"
    }
    "all" {
        Deploy-Subtree "Aetheria (Hub)" "Aetheria" "heroku"
        Deploy-Subtree "TerraScope" "TerraScope/frontend" "heroku-terrascope"
        Deploy-Subtree "Forma-3D" "Forma-3D/frontend" "heroku-forma"
        Deploy-Subtree "Lumina" "Lumina/frontend" "heroku-lumina"
        Write-Host "`nAll 4 projects deployed successfully!" -ForegroundColor Green
    }
}
