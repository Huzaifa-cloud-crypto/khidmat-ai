# Replace YOUR_NEW_KEY with the key you copied from AI Studio
$NEW_KEY = "YOUR_NEW_KEY"

# Update Cloud Run environment variable
gcloud run services update khidmat-ai `
  --region us-central1 `
  --update-env-vars "GEMINI_API_KEY=$NEW_KEY"

# Also update local .env file
(Get-Content ".\backend\.env") -replace "GEMINI_API_KEY=.*", "GEMINI_API_KEY=$NEW_KEY" | Set-Content ".\backend\.env"

Write-Host "Done! API key updated on Cloud Run and .env"
