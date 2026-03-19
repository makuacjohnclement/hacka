# deploy.ps1
# Script to build and deploy SmartAid to Google Cloud Run

$PROJECT_ID = "YOUR_GCP_PROJECT_ID"
$REGION = "europe-west1" # e.g., us-central1 or europe-west1

Write-Host "Deploying SmartAid Backend to Google Cloud Run..." -ForegroundColor Cyan

# Backend Deployment
cd backend
gcloud auth configure-docker
gcloud builds submit --tag gcr.io/$PROJECT_ID/smartaid-backend
gcloud run deploy smartaid-backend --image gcr.io/$PROJECT_ID/smartaid-backend --platform managed --region $REGION --allow-unauthenticated --port 8080
cd ..

Write-Host "Deploying SmartAid Frontend to Google Cloud Run..." -ForegroundColor Cyan

# Frontend Deployment
cd frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/smartaid-frontend
gcloud run deploy smartaid-frontend --image gcr.io/$PROJECT_ID/smartaid-frontend --platform managed --region $REGION --allow-unauthenticated --port 8080
cd ..

Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "Make sure you update the backend URL in frontend/src/services/api.js to the new deployed backend URL." -ForegroundColor Yellow
