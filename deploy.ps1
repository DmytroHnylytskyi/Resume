param (
    [Parameter(Mandatory=True, Position=0)]
    [ValidateSet("aetheria", "terrascope", "forma", "lumina", "all")]
    [string]
)

function Deploy-Subtree (, , ) {
    Write-Host "
?? Deploying  () to ..." -ForegroundColor Cyan
     = "deploy-tmp-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
    
    try {
        Write-Host "?? Splitting subtree for ..." -ForegroundColor DarkGray
        git subtree split --prefix  -b 
        
        Write-Host "?? Pushing to Heroku ()..." -ForegroundColor Yellow
        git -c credential.helper= push  ":main" --force
        
        Write-Host "? Successfully deployed  to Heroku!" -ForegroundColor Green
    }
    catch {
        Write-Host "? Error deploying  : " -ForegroundColor Red
    }
    finally {
        git branch -D  2>
    }
}

switch () {
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
        Write-Host "
?? All 4 projects deployed successfully!" -ForegroundColor Green
    }
}
